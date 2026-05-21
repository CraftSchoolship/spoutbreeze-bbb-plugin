import { useState } from 'react';
import { pluginLogger } from 'bigbluebutton-html-plugin-sdk';
import {
  fetchStreamEndpoints,
  StreamEndpointsRes,
} from '../api/streamEndpoints';
import { fetchMeetingDetails, MeetingDetailsRes } from '../api/meetingDetails';
import { startStream } from '../api/startStream';
import { fetchBroadcastStatus } from '../api/broadcastStatus';
import { stopStream } from '../api/stopStream';
import {
  connectFacebookGateway,
  disconnectFacebookGateway,
} from '../api/facebookGateway';
import {
  fetchFacebookStatus,
  fetchFacebookPages,
  facebookGoLive,
  facebookEndLive,
  FacebookPage,
} from '../api/facebookStream';

export interface FacebookDestination {
  id: string; // "fb:me" or "fb:{page_id}"
  label: string;
  target: string; // "me" or page_id
}

export const useStreamManager = () => {
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetailsRes | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [streamEndpoints, setStreamEndpoints] = useState<StreamEndpointsRes[]>(
    [],
  );
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Facebook destinations
  const [facebookDestinations, setFacebookDestinations] = useState<FacebookDestination[]>([]);
  const [facebookConnected, setFacebookConnected] = useState<boolean>(false);

  // Stream state
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(() => localStorage.getItem('current_stream_id'));
  const [isStreaming, setIsStreaming] = useState<boolean>(
    !!localStorage.getItem('current_stream_id'),
  );

  // Facebook live state (stored to end the live video on stop)
  const [fbLiveVideoId, setFbLiveVideoId] = useState<string | null>(
    () => localStorage.getItem('fb_live_video_id'),
  );
  const [fbLiveTarget, setFbLiveTarget] = useState<string | null>(
    () => localStorage.getItem('fb_live_target'),
  );

  const loadStreamData = async (internalMeetingId: string) => {
    setIsLoading(true);
    try {
      if (!internalMeetingId) {
        throw new Error('Meeting ID not available');
      }

      // Fetch meeting details, stream endpoints, and Facebook status concurrently
      const [meetingDetailsResponse, endpointsResponse] = await Promise.all([
        fetchMeetingDetails(internalMeetingId),
        fetchStreamEndpoints(),
      ]);

      setMeetingDetails(meetingDetailsResponse);
      setStreamEndpoints(endpointsResponse);

      if (endpointsResponse.length > 0) {
        setSelectedEndpointId(endpointsResponse[0].id);
      }

      // Check Facebook status (non-blocking — don't fail if this fails)
      try {
        const meetingId = meetingDetailsResponse.meeting_id;
        const fbStatus = await fetchFacebookStatus(meetingId);

        if (fbStatus.connected && !fbStatus.is_expired) {
          setFacebookConnected(true);

          // Build Facebook destinations
          const destinations: FacebookDestination[] = [
            { id: 'fb:me', label: '📘 Facebook — My Profile', target: 'me' },
          ];

          try {
            const pages = await fetchFacebookPages(meetingId);
            pages.forEach((page: FacebookPage) => {
              if (page.is_active) {
                destinations.push({
                  id: `fb:${page.page_id}`,
                  label: `📘 Facebook — ${page.page_name || `Page ${page.page_id}`}`,
                  target: page.page_id,
                });
              }
            });
          } catch {
            pluginLogger.info('No Facebook pages or fetch failed');
          }

          setFacebookDestinations(destinations);

          // If no saved endpoints, default to Facebook
          if (endpointsResponse.length === 0 && destinations.length > 0) {
            setSelectedEndpointId(destinations[0].id);
          }
        } else {
          setFacebookConnected(false);
          setFacebookDestinations([]);
        }
      } catch {
        // Facebook not connected — that's fine
        setFacebookConnected(false);
        setFacebookDestinations([]);
      }

      setStatusMessage('Stream data loaded successfully');
      setIsLoading(false);
    } catch (error) {
      setStatusMessage(`Error loading stream data: ${error.message}`);
      pluginLogger.error('Error loading stream data:', error);
      setIsLoading(false);
    }
  };

  const pollStatus = async (streamId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // ~150s if 5s interval
    const intervalMs = 20000; // 20 seconds

    const loop = async () => {
      attempts += 1;
      try {
        const status = await fetchBroadcastStatus(streamId);
        if (status.status === 'running') {
          setStatusMessage(`Stream running (pod: ${status.pod_name})`);
          pluginLogger.info('Broadcast running', status);
          return;
        }
        if (status.status === 'failed') {
          setStatusMessage(`Stream failed: ${status.error || 'unknown error'}`);
          pluginLogger.error('Broadcast failed', status);
          return;
        }
        if (attempts < maxAttempts) {
          setTimeout(loop, intervalMs);
        } else {
          setStatusMessage('Timeout waiting for stream to start');
        }
      } catch (e) {
        setStatusMessage('Error polling stream status');
        pluginLogger.error('Polling error', e);
      }
    };
    loop();
  };

  const isFacebookDestination = (id: string): boolean => id.startsWith('fb:');

  const handleStreamStart = async () => {
    if (!selectedEndpointId) {
      setStatusMessage('Please select a stream destination');
      return;
    }
    if (!meetingDetails) {
      setStatusMessage('Meeting details not loaded');
      return;
    }

    try {
      let rtmpUrl: string;
      let streamKey: string;
      let platform: string;
      let facebookGatewayPayload: {
        liveStreamId: string;
        liveVideoId: string;
        target: string;
      } | null = null;

      if (isFacebookDestination(selectedEndpointId)) {
        // ── Facebook 2-step flow ──
        // Step 1: Call go-live to create LiveVideo and get RTMP URL
        const fbDest = facebookDestinations.find(
          (d) => d.id === selectedEndpointId,
        );
        if (!fbDest) {
          setStatusMessage('Invalid Facebook destination');
          return;
        }

        setStatusMessage('Creating Facebook live video...');
        const goLiveRes = await facebookGoLive(
          meetingDetails.meeting_id,
          fbDest.target,
        );

        // Save FB live state for stop
        setFbLiveVideoId(goLiveRes.live_video_id);
        setFbLiveTarget(goLiveRes.target);
        localStorage.setItem('fb_live_video_id', goLiveRes.live_video_id);
        localStorage.setItem('fb_live_target', goLiveRes.target);

        facebookGatewayPayload = {
          liveStreamId: goLiveRes.live_video_id,
          liveVideoId: goLiveRes.live_video_id,
          target: goLiveRes.target,
        };

        rtmpUrl = goLiveRes.rtmp_url;
        streamKey = goLiveRes.stream_key;
        platform = 'facebook';

        pluginLogger.info('Facebook LiveVideo created:', goLiveRes.live_video_id);
      } else {
        // ── Standard flow (Twitch / YouTube / custom) ──
        const selectedEndpoint = streamEndpoints.find(
          (e) => e.id === selectedEndpointId,
        );
        if (!selectedEndpoint) {
          setStatusMessage('Invalid stream endpoint selected');
          return;
        }

        rtmpUrl = selectedEndpoint.rtmp_url;
        streamKey = selectedEndpoint.stream_key;
        platform = selectedEndpoint.title;
      }

      // Step 2: Start the broadcaster with RTMP URL
      const payload = {
        meeting_id: meetingDetails.meeting_id,
        rtmp_url: rtmpUrl,
        stream_key: streamKey,
        password: meetingDetails.moderator_pw,
        platform,
      };

      const res = await startStream(payload);
      const sid = res.stream.stream_id;
      setCurrentStreamId(sid);
      setIsStreaming(true);
      localStorage.setItem('current_stream_id', sid);

      if (facebookGatewayPayload) {
        try {
          await connectFacebookGateway({
            userId: meetingDetails.user_id,
            meetingId: meetingDetails.meeting_id,
            liveStreamId: facebookGatewayPayload.liveStreamId,
            liveVideoId: facebookGatewayPayload.liveVideoId,
            target: facebookGatewayPayload.target,
          });
          pluginLogger.info(
            `Facebook chat-gateway connected for meeting ${meetingDetails.meeting_id}`,
          );
        } catch (gatewayError) {
          pluginLogger.error(
            'Facebook stream started but chat-gateway connect failed',
            gatewayError,
          );
        }
      }

      setStatusMessage(`Broadcast started (stream_id: ${sid})`);
      pollStatus(sid);
    } catch (error: unknown) {
      if (
        typeof error === 'object' && error !== null && 'response' in error && (error as { response?: { status?: number } }).response?.status === 403
      ) {
        const errorDetail = (
          error as {
            response?: { data?: { detail?: string } };
          }
        ).response?.data?.detail || 'Concurrent stream limit reached';
        setStatusMessage(errorDetail);
        pluginLogger.error('Concurrent stream limit:', errorDetail);
      } else {
        const msg = error instanceof Error ? error.message : 'Error starting stream';
        setStatusMessage(msg);
        pluginLogger.error('Error starting stream:', error);
      }
    }
  };

  const handleStreamStop = async () => {
    const sid = currentStreamId || localStorage.getItem('current_stream_id');
    if (!sid) {
      setStatusMessage('No active stream to stop');
      return;
    }
    try {
      await stopStream(sid);

      // If this was a Facebook stream, also end the LiveVideo
      const liveId = fbLiveVideoId || localStorage.getItem('fb_live_video_id');
      const liveTarget = fbLiveTarget || localStorage.getItem('fb_live_target');
      if (liveId && meetingDetails) {
        try {
          await facebookEndLive(
            meetingDetails.meeting_id,
            liveId,
            liveTarget || 'me',
          );
          pluginLogger.info('Facebook LiveVideo ended:', liveId);
        } catch (e) {
          pluginLogger.error('Failed to end Facebook live:', e);
          // Don't block the stop — broadcaster is already stopped
        }
      }

      if (meetingDetails) {
        try {
          await disconnectFacebookGateway(meetingDetails.user_id);
          pluginLogger.info(
            `Facebook chat-gateway disconnected for user ${meetingDetails.user_id}`,
          );
        } catch (gatewayError) {
          pluginLogger.error(
            'Failed to disconnect Facebook from chat-gateway',
            gatewayError,
          );
        }
      }

      setStatusMessage('Stream stopped');
      setIsStreaming(false);
      setCurrentStreamId(null);
      setFbLiveVideoId(null);
      setFbLiveTarget(null);
      localStorage.removeItem('current_stream_id');
      localStorage.removeItem('current_stream_status');
      localStorage.removeItem('fb_live_video_id');
      localStorage.removeItem('fb_live_target');
    } catch (e: unknown) {
      setStatusMessage('Error stopping stream');
      pluginLogger.error('Stop stream failed', e);
    }
  };

  return {
    meetingDetails,
    statusMessage,
    streamEndpoints,
    facebookDestinations,
    facebookConnected,
    selectedEndpointId,
    isLoading,
    isStreaming,
    currentStreamId,
    setSelectedEndpointId,
    loadStreamData,
    handleStreamStart,
    handleStreamStop,
  };
};
