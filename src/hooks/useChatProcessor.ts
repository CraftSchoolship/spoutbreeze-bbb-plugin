import { useEffect, useState } from "react";
import { PluginApi, pluginLogger } from "bigbluebutton-html-plugin-sdk";
import { loadProcessedIds, saveProcessedIds } from "../utils/messageProcessor";
import type { NormalizedMessage, OutboundMessage } from "./useTwitchChat";

export const useChatProcessor = (
  pluginApi: PluginApi,
  messages: NormalizedMessage[],
  sendMessage: (payload: OutboundMessage) => void
) => {
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(
    new Set()
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
        if (msg.messageId) currentIds.add(msg.messageId);
      });
      setProcessedMessageIds(currentIds);
      saveProcessedIds(currentIds);
      setIsInitialized(true);
    }
  }, [loadedChatMessages, isInitialized]);

  // BBB → Gateway (Twitch) using "/twitch ..."
  useEffect(() => {
    if (!isInitialized || !loadedChatMessages?.data || !currentUser?.data)
      return;

    const newMessages = loadedChatMessages.data.filter(
      (msg) => msg.messageId && !processedMessageIds.has(msg.messageId)
    );

    if (newMessages.length === 0) return;

    const updatedProcessedIds = new Set(processedMessageIds);

    for (const chatMessage of newMessages) {
      if (!chatMessage.messageId) continue;

      // Skip messages we injected from gateway to avoid loops
      // Match any platform marker pattern
      if (
        chatMessage.message?.includes("**🟢 [") ||
        chatMessage.message?.includes("[Twitch]") ||
        chatMessage.message?.includes("[Youtube]")
      ) {
        updatedProcessedIds.add(chatMessage.messageId);
        continue;
      }

      // Command: /twitch Hello world
      if (chatMessage.message?.startsWith("/twitch")) {
        const text = chatMessage.message.replace(/^\/twitch\s*/, "").trim();
        if (text) {
          try {
            // Get the stored backend user ID
            const backendUserId = localStorage.getItem("backend_user_id");

            if (!backendUserId) {
              pluginLogger.error(
                "[ChatProcessor] No backend_user_id found. Please start streaming first."
              );
              updatedProcessedIds.add(chatMessage.messageId);
              continue;
            }

            const payload: OutboundMessage = {
              type: "outbound_message",
              platform: "twitch",
              text,
              user: {
                id: backendUserId, // Use backend user UUID
                name: currentUser.data.name,
              },
            };
            sendMessage(payload);
            pluginLogger.info(
              `[ChatProcessor] Sent to Twitch: ${text} (user: ${backendUserId})`
            );
          } catch (error) {
            console.error("Error sending to Gateway:", error);
          }
        }
      }

      updatedProcessedIds.add(chatMessage.messageId);
    }

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
    if (!messages.length) return;

    const newFrames = messages.filter((m) => {
      const msgId = m.message_id || `${m.platform}-${m.user?.id}-${m.text}`;
      return !processedMessageIds.has(msgId);
    });

    if (newFrames.length === 0) return;

    // Format messages with platform prefix
    const formatted = newFrames.map(
      (m) =>
        `**🟢 [${
          m.platform.charAt(0).toUpperCase() + m.platform.slice(1)
        }]**\n**${m.user?.name || "unknown"}**: ${m.text}`
    );

    // Send to BBB chat using serverCommands
    pluginApi.serverCommands.chat.sendPublicChatMessage({
      textMessageInMarkdownFormat: formatted.join("\n"),
    });

    pluginLogger.info(
      `[ChatProcessor] Injected ${newFrames.length} message(s) into BBB chat`
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
    const cleanupInterval = setInterval(() => {
      const ids = loadProcessedIds();
      if (ids.size > 1000) {
        const recentIds = new Set(Array.from(ids).slice(-1000));
        saveProcessedIds(recentIds);
        setProcessedMessageIds(recentIds);
      }
    }, 1000 * 60 * 60); // Every hour

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    processedMessageIds,
    isInitialized,
  };
};
