import {
  BbbPluginSdk,
  PluginApi,
  ActionButtonDropdownSeparator,
  ActionButtonDropdownOption,
  pluginLogger,
} from "bigbluebutton-html-plugin-sdk";
import * as React from "react";
import { useEffect, useState } from "react";
import { SampleStreamButtonPluginItemProps } from "./types";
import { useTwitchChat } from "../../hooks/useTwitchChat";
import { useStreamManager } from "../../hooks/useStreamManager";
import { useChatProcessor } from "../../hooks/useChatProcessor";
import { StreamModal } from "./StreamModal";
import "./style.css";

function SampleStreamButtonPluginItem({
  pluginUuid: uuid,
}: SampleStreamButtonPluginItemProps): React.ReactElement {
  BbbPluginSdk.initialize(uuid);
  const pluginApi: PluginApi = BbbPluginSdk.getPluginApi(uuid);
  const { data: currentUser } = pluginApi.useCurrentUser();
  const { data: meetingInfo } = pluginApi.useMeeting();
  const [showModal, setShowModal] = useState<boolean>(false);

  const CHAT_GATEWAY_URL = process.env.CHAT_GATEWAY_URL;
  const API_URL = process.env.API_URL;

  const { messages, sendMessage } = useTwitchChat(
    `${CHAT_GATEWAY_URL}/ws/chat/`
  );

  const {
    meetingDetails,
    statusMessage,
    streamEndpoints,
    selectedEndpointId,
    isLoading,
    setSelectedEndpointId,
    loadStreamData,
    handleStreamStart,
    handleStreamStop,
    isStreaming,
  } = useStreamManager();

  useChatProcessor(pluginApi, messages, sendMessage);

  const handleStartStreamButtonClick = () => {
    setShowModal(true);
    const internalMeetingId = Array.isArray(meetingInfo)
      ? meetingInfo[0]?.meetingId
      : (meetingInfo as any)?.meetingId;

    if (internalMeetingId) {
      loadStreamData(internalMeetingId);
    }
    pluginLogger.info("Start Stream button clicked");
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await handleStreamStart();
  };

  useEffect(() => {
    if (currentUser?.presenter) {
      const items = [
        new ActionButtonDropdownSeparator(),
        new ActionButtonDropdownOption({
          label: "Start Stream",
          icon: "play",
          tooltip: "Start Stream",
          allowed: true,
          onClick: () => {
            handleStartStreamButtonClick();
          },
        }),
      ];
      if (isStreaming) {
        items.push(
          new ActionButtonDropdownSeparator(),
          new ActionButtonDropdownOption({
            label: "Stop Stream",
            icon: "stop",
            tooltip: "Stop current stream",
            allowed: true,
            onClick: () => {
              handleStreamStop();
            },
          })
        );
      }
      pluginApi.setActionButtonDropdownItems(items);
    }
  }, [currentUser, isStreaming, pluginApi]);

  return (
    <StreamModal
      isOpen={showModal}
      onClose={handleCloseModal}
      isLoading={isLoading}
      streamEndpoints={streamEndpoints}
      selectedEndpointId={selectedEndpointId}
      onEndpointChange={setSelectedEndpointId}
      onSubmit={handleFormSubmit}
      meetingDetails={meetingDetails}
      statusMessage={statusMessage}
    />
  );
}

export default SampleStreamButtonPluginItem;
