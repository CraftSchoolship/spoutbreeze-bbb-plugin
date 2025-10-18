import { useEffect, useRef, useState } from "react";

export type NormalizedMessage = {
  platform: string; // "twitch" | "youtube" | ...
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

export const useTwitchChat = (url: string) => {
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Gateway WS] Connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Accept normalized chat message frames
        if (data && data.type === "message" && data.platform && data.text) {
          setMessages((prev) => [...prev, data as NormalizedMessage]);
        }
      } catch {
        // Ignore non-JSON pings or other frames
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
  }, [url]);

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
