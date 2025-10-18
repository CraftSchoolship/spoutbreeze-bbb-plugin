import { useState } from "react";
import {
  fetchStreamEndpoints,
  StreamEndpointsRes,
} from "../api/streamEndpoints";
import { fetchMeetingDetails, MeetingDetailsRes } from "../api/meetingDetails";
import { startStream } from "../api/startStream";
import { fetchBroadcastStatus } from "../api/broadcastStatus";
import { stopStream } from "../api/stopStream";
import { pluginLogger } from "bigbluebutton-html-plugin-sdk";

export const useStreamManager = () => {
  const [meetingDetails, setMeetingDetails] =
    useState<MeetingDetailsRes | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [streamEndpoints, setStreamEndpoints] = useState<StreamEndpointsRes[]>(
    []
  );
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // New state
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(() =>
    localStorage.getItem("current_stream_id")
  );
  const [isStreaming, setIsStreaming] = useState<boolean>(
    !!localStorage.getItem("current_stream_id")
  );

  const loadStreamData = async (internalMeetingId: string) => {
    setIsLoading(true);
    try {
      if (!internalMeetingId) {
        throw new Error("Meeting ID not available");
      }

      console.log("Loading data for meeting:", internalMeetingId);

      // Fetch both meeting details and stream endpoints concurrently
      const [meetingDetailsResponse, endpointsResponse] = await Promise.all([
        fetchMeetingDetails(internalMeetingId),
        fetchStreamEndpoints(),
      ]);

      setMeetingDetails(meetingDetailsResponse);
      setStreamEndpoints(endpointsResponse);

      if (endpointsResponse.length > 0) {
        setSelectedEndpointId(endpointsResponse[0].id);
      }

      setStatusMessage("Stream data loaded successfully");
      setIsLoading(false);
    } catch (error) {
      setStatusMessage(`Error loading stream data: ${error.message}`);
      pluginLogger.error("Error loading stream data:", error);
      console.error("Error loading stream data:", error);
      setIsLoading(false);
    }
  };

  const pollStatus = async (streamId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // ~150s if 5s interval
    const intervalMs = 5000;

    const loop = async () => {
      attempts++;
      try {
        const status = await fetchBroadcastStatus(streamId);
        if (status.status === "running") {
          setStatusMessage(`Stream running (pod: ${status.pod_name})`);
          pluginLogger.info("Broadcast running", status);
          return;
        }
        if (status.status === "failed") {
          setStatusMessage(`Stream failed: ${status.error || "unknown error"}`);
          pluginLogger.error("Broadcast failed", status);
          return;
        }
        if (attempts < maxAttempts) {
          setTimeout(loop, intervalMs);
        } else {
          setStatusMessage("Timeout waiting for stream to start");
        }
      } catch (e) {
        setStatusMessage("Error polling stream status");
        pluginLogger.error("Polling error", e);
      }
    };
    loop();
  };

  const handleStreamStart = async () => {
    if (!selectedEndpointId) {
      setStatusMessage("Please select a stream endpoint");
      return;
    }
    if (!meetingDetails) {
      setStatusMessage("Meeting details not loaded");
      return;
    }
    const selectedEndpoint = streamEndpoints.find(
      (e) => e.id === selectedEndpointId
    );
    if (!selectedEndpoint) {
      setStatusMessage("Invalid stream endpoint selected");
      return;
    }
    try {
      const payload = {
        meeting_id: meetingDetails.meeting_id,
        rtmp_url: selectedEndpoint.rtmp_url,
        stream_key: selectedEndpoint.stream_key,
        password: meetingDetails.moderator_pw,
        platform: selectedEndpoint.title,
      };
      const res = await startStream(payload);
      const sid = res.stream.stream_id;
      setCurrentStreamId(sid);
      setIsStreaming(true);
      localStorage.setItem("current_stream_id", sid);
      setStatusMessage(`Broadcast started (stream_id: ${sid})`);
      pollStatus(sid);
    } catch (error: any) {
      setStatusMessage("Error starting stream");
      pluginLogger.error("Error starting stream:", error);
    }
  };

  const handleStreamStop = async () => {
    const sid = currentStreamId || localStorage.getItem("current_stream_id");
    if (!sid) {
      setStatusMessage("No active stream to stop");
      return;
    }
    try {
      await stopStream(sid);
      setStatusMessage("Stream stopped");
      setIsStreaming(false);
      setCurrentStreamId(null);
      localStorage.removeItem("current_stream_id");
      localStorage.removeItem("current_stream_status");
    } catch (e: any) {
      setStatusMessage("Error stopping stream");
      pluginLogger.error("Stop stream failed", e);
    }
  };

  return {
    meetingDetails,
    statusMessage,
    streamEndpoints,
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
