import { useEffect, useRef, useState } from 'react';
import { pluginLogger } from 'bigbluebutton-html-plugin-sdk';

export type NormalizedMessage = {
  platform: string;
  type: 'message';
  user: { id?: string; name: string };
  text: string;
  timestamp?: string;
  message_id?: string;
};

export type OutboundMessage = {
  type: 'outbound_message';
  platform: string;
  text: string;
  user?: { id?: string; name?: string };
};

export const useTwitchChat = (url: string, meetingId?: string) => {
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 2000; // 2 seconds

  const connect = () => {
    const wsUrl = meetingId ? `${url}?meeting_id=${encodeURIComponent(meetingId)}` : url;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // console.log('[Gateway WS] Connected', meetingId ? `with meeting_id=${meetingId}` : '');
        reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'message' && data.platform && data.text) {
            setMessages((prev) => [...prev, data as NormalizedMessage]);
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = (error) => {
        // console.error('[Gateway WS] Error:', error);
        pluginLogger.error('[Gateway WS] Error:', error);
      };

      ws.onclose = (event) => {
        // console.log(`[Gateway WS] Disconnected (code: ${event.code}, reason: ${event.reason})`);
        pluginLogger.info(`[Gateway WS] Disconnected (code: ${event.code}, reason: ${event.reason})`);
        // Attempt to reconnect if not intentionally closed
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(baseReconnectDelay * 2 ** reconnectAttemptsRef.current, 30000);

          // console.log(
          //   `[Gateway WS] Reconnecting in ${delay}ms (attempt ${
          //     reconnectAttemptsRef.current + 1
          //   }/${maxReconnectAttempts})`,
          // );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          // console.error('[Gateway WS] Max reconnection attempts reached');
        }
      };
    } catch (error) {
      // console.error('[Gateway WS] Connection failed:', error);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [url, meetingId]);

  const sendMessage = (payload: OutboundMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      // console.log('[Gateway WS] Outbound:', payload);
    } else {
      // console.warn('[Gateway WS] Cannot send - WebSocket not connected');
    }
  };

  return {
    messages,
    sendMessage,
  };
};
