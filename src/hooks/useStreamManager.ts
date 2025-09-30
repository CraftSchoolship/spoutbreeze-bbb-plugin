import { useState } from "react";
import { fetchStreamEndpoints, StreamEndpointsRes } from "../api/streamEndpoints";
import { fetchMeetingDetails, MeetingDetailsRes } from "../api/meetingDetails";
import { startStream } from "../api/startStream";
import { pluginLogger } from "bigbluebutton-html-plugin-sdk";

export const useStreamManager = () => {
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetailsRes | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [streamEndpoints, setStreamEndpoints] = useState<StreamEndpointsRes[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
        fetchStreamEndpoints()
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
      (endpoint) => endpoint.id === selectedEndpointId
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
      
      console.log("Starting stream with payload:", payload);
      await startStream(payload);
      setStatusMessage("Stream started successfully");
      pluginLogger.info("Stream started successfully");
    } catch (error) {
      setStatusMessage("Error starting stream");
      pluginLogger.error("Error starting stream:", error);
    }
  };

  return {
    meetingDetails,
    statusMessage,
    streamEndpoints,
    selectedEndpointId,
    isLoading,
    setSelectedEndpointId,
    loadStreamData,
    handleStreamStart,
  };
};