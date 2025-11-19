import { useEffect, useRef, useState } from "react";

export type NormalizedMessage = {
  platform: string;
  type: "message";
  user: { id?: string; name: string };
  text: string;
  timestamp?: string;
  message_id?: string;
};

export type OutboundMessage = {
  type: "outbound_message";
  platform: string;
  text: string;
  user?: { id?: string; name?: string };
};

// Accept meeting_id parameter
export const useTwitchChat = (url: string, meetingId?: string) => {
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Build WebSocket URL with meeting_id query param
    const wsUrl = meetingId ? `${url}?meeting_id=${encodeURIComponent(meetingId)}` : url;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Gateway WS] Connected", meetingId ? `with meeting_id=${meetingId}` : "");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.type === "message" && data.platform && data.text) {
          setMessages((prev) => [...prev, data as NormalizedMessage]);
        }
      } catch {
        // Ignore
      }
    };

    ws.onerror = (error) => {
      console.error("[Gateway WS] Error:", error);
    };

    ws.onclose = () => {
      console.log("[Gateway WS] Disconnected");
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [url, meetingId]);

  const sendMessage = (payload: OutboundMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      console.log("[Gateway WS] Outbound:", payload);
    }
  };

  return {
    messages,
    sendMessage,
  };
};
