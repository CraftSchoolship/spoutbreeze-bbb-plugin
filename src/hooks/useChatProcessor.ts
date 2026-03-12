import { useEffect, useState } from 'react';
import { PluginApi, pluginLogger } from 'bigbluebutton-html-plugin-sdk';
import { loadProcessedIds, saveProcessedIds } from '../utils/messageProcessor';
import type { NormalizedMessage, OutboundMessage } from './useTwitchChat';

export const useChatProcessor = (
  pluginApi: PluginApi,
  messages: NormalizedMessage[],
  sendMessage: (payload: OutboundMessage) => void,
) => {
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const loadedChatMessages = pluginApi.useLoadedChatMessages();
  const currentUser = pluginApi.useCurrentUser();

  // Initialize processed IDs from BBB history
  useEffect(() => {
    if (!isInitialized && loadedChatMessages?.data) {
      const storedIds = loadProcessedIds();
      const currentIds = new Set(storedIds);
      loadedChatMessages.data.forEach((msg) => {
        if (msg.messageId) {
          currentIds.add(msg.messageId);
        }
      });
      setProcessedMessageIds(currentIds);
      saveProcessedIds(currentIds);
      setIsInitialized(true);
    }
  }, [loadedChatMessages, isInitialized]);

  // BBB → Gateway (Platform) using "/twitch ...", "/youtube ...", or "/facebook ..."
  useEffect(() => {
    if (!isInitialized || !loadedChatMessages?.data || !currentUser?.data) {
      return;
    }

    const newMessages = loadedChatMessages.data.filter(
      (msg) => msg.messageId && !processedMessageIds.has(msg.messageId),
    );

    if (newMessages.length === 0) {
      return;
    }

    const updatedProcessedIds = new Set(processedMessageIds);

    newMessages.forEach((chatMessage) => {
      if (!chatMessage.messageId) {
        return;
      }

      // Skip messages we injected from gateway
      if (
        chatMessage.message?.includes('**🟢 [')
        || chatMessage.message?.includes('**🔴 [')
      ) {
        updatedProcessedIds.add(chatMessage.messageId);
        return;
      }

      // Command: /twitch Hello world
      if (chatMessage.message?.startsWith('/twitch')) {
        const text = chatMessage.message.replace(/^\/twitch\s*/, '').trim();
        if (text) {
          const payload: OutboundMessage = {
            type: 'outbound_message',
            platform: 'twitch',
            text,
          };
          sendMessage(payload);
          pluginLogger.info(`[ChatProcessor] Sent to Twitch: ${text}`);
        }
      } else if (chatMessage.message?.startsWith('/youtube')) {
        // Command: /youtube Hello world
        const text = chatMessage.message.replace(/^\/youtube\s*/, '').trim();
        if (text) {
          const payload: OutboundMessage = {
            type: 'outbound_message',
            platform: 'youtube',
            text,
          };
          sendMessage(payload);
          pluginLogger.info(`[ChatProcessor] Sent to YouTube: ${text}`);
        }
      } else if (chatMessage.message?.startsWith('/facebook')) {
        // Command: /facebook Hello world
        const text = chatMessage.message.replace(/^\/facebook\s*/, '').trim();
        if (text) {
          const payload: OutboundMessage = {
            type: 'outbound_message',
            platform: 'facebook',
            text,
          };
          sendMessage(payload);
          pluginLogger.info(`[ChatProcessor] Sent to Facebook: ${text}`);
        }
      }

      updatedProcessedIds.add(chatMessage.messageId);
    });

    setProcessedMessageIds(updatedProcessedIds);
    saveProcessedIds(updatedProcessedIds);
  }, [
    loadedChatMessages,
    processedMessageIds,
    sendMessage,
    isInitialized,
    currentUser,
  ]);

  // Gateway → BBB
  useEffect(() => {
    if (!messages.length) {
      return;
    }

    const newFrames = messages.filter((m) => {
      const msgId = m.message_id || `${m.platform}-${m.user?.id}-${m.text}`;
      return !processedMessageIds.has(msgId);
    });

    if (newFrames.length === 0) {
      return;
    }

    // Format messages with platform-specific icon
    const formatted = newFrames.map((m) => {
      const platformName = m.platform.charAt(0).toUpperCase() + m.platform.slice(1);
      const icon = m.platform === 'youtube' ? '🔴' : m.platform === 'facebook' ? '🔵' : '🟢';
      return `**${icon} [${platformName}]**\n**${
        m.user?.name || 'unknown'
      }**: ${m.text}`;
    });

    pluginApi.serverCommands.chat.sendPublicChatMessage({
      textMessageInMarkdownFormat: formatted.join('\n'),
    });

    pluginLogger.info(
      `[ChatProcessor] Injected ${newFrames.length} message(s) into BBB chat`,
    );

    // Mark as processed
    const updatedProcessedIds = new Set(processedMessageIds);
    newFrames.forEach((m) => {
      const msgId = m.message_id || `${m.platform}-${m.user?.id}-${m.text}`;
      updatedProcessedIds.add(msgId);
    });
    setProcessedMessageIds(updatedProcessedIds);
    saveProcessedIds(updatedProcessedIds);
  }, [messages, processedMessageIds, pluginApi]);

  // Cleanup old processed IDs periodically
  useEffect(() => {
    const cleanupInterval = setInterval(
      () => {
        const ids = loadProcessedIds();
        if (ids.size > 1000) {
          const recentIds = new Set(Array.from(ids).slice(-1000));
          saveProcessedIds(recentIds);
          setProcessedMessageIds(recentIds);
        }
      },
      1000 * 60 * 60,
    ); // Every hour

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  return {
    processedMessageIds,
    isInitialized,
  };
};
