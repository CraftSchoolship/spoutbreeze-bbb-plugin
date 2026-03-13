import {
  BbbPluginSdk,
  PluginApi,
  ActionButtonDropdownSeparator,
  ActionButtonDropdownOption,
  pluginLogger,
} from 'bigbluebutton-html-plugin-sdk';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { SampleStreamButtonPluginItemProps } from './types';
import { useTwitchChat } from '../../hooks/useTwitchChat';
import { useStreamManager } from '../../hooks/useStreamManager';
import { useChatProcessor } from '../../hooks/useChatProcessor';
import { StreamModal } from './StreamModal';
import './style.css';

function SampleStreamButtonPluginItem({
  pluginUuid: uuid,
}: SampleStreamButtonPluginItemProps): React.ReactElement {
  BbbPluginSdk.initialize(uuid);
  const pluginApi: PluginApi = BbbPluginSdk.getPluginApi(uuid);
  const { data: currentUser } = pluginApi.useCurrentUser();
  const { data: meetingInfo } = pluginApi.useMeeting();
  const [showModal, setShowModal] = useState<boolean>(false);

  const { CHAT_GATEWAY_URL } = process.env;

  // Extract meeting_id from BBB SDK
  const internalMeetingId = Array.isArray(meetingInfo)
    ? meetingInfo[0]?.meetingId
    : (meetingInfo as { meetingId?: string } | undefined)?.meetingId;

  const {
    meetingDetails,
    statusMessage,
    streamEndpoints,
    facebookDestinations,
    facebookConnected,
    selectedEndpointId,
    isLoading,
    setSelectedEndpointId,
    loadStreamData,
    handleStreamStart,
    handleStreamStop,
    isStreaming,
  } = useStreamManager();

  // ALWAYS establish WebSocket connection if stream is active OR if user is presenter
  // The WebSocket itself will only broadcast to ONE connection, but all users can listen
  // The key is that only ONE user should have isStreaming=true

  // Simplified: Connect if stream is active (determined by localStorage)
  // Only the presenter who started the stream will have isStreaming=true
  const { messages, sendMessage } = useTwitchChat(
    `${CHAT_GATEWAY_URL}/ws/chat/`,
    internalMeetingId,
  );

  // Only process messages if this is the presenter (to avoid duplicates)
  // Pass isStreaming flag to processor
  useChatProcessor(
    pluginApi,
    currentUser?.presenter && isStreaming ? messages : [],
    sendMessage,
  );

  const handleStartStreamButtonClick = (): void => {
    setShowModal(true);
    loadStreamData(internalMeetingId);
    pluginLogger.info('Start Stream button clicked');
  };

  const handleCloseModal = (): void => {
    setShowModal(false);
  };

  const handleFormSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    await handleStreamStart();
  };

  useEffect(() => {
    if (currentUser?.presenter) {
      const items = [
        new ActionButtonDropdownSeparator(),
        new ActionButtonDropdownOption({
          label: 'Start Stream',
          icon: 'play',
          tooltip: 'Start Stream',
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
            label: 'Stop Stream',
            icon: 'stop',
            tooltip: 'Stop current stream',
            allowed: true,
            onClick: () => {
              handleStreamStop();
            },
          }),
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
      facebookDestinations={facebookDestinations}
      facebookConnected={facebookConnected}
      selectedEndpointId={selectedEndpointId}
      onEndpointChange={setSelectedEndpointId}
      onSubmit={handleFormSubmit}
      meetingDetails={meetingDetails}
      statusMessage={statusMessage}
    />
  );
}

export default SampleStreamButtonPluginItem;
