export const parseTwitchMessage = (msg: string) => {
  try {
    if (!msg.includes("PRIVMSG")) return null;

    // Extract username (everything between : and !)
    const user = msg.split("!")[0].substring(1);

    // Extract message (everything after the second :)
    const msgParts = msg.split(":");
    const text = msgParts.length >= 3 ? msgParts[2] : "";

    return { user, text };
  } catch (error) {
    console.error("Error parsing Twitch message:", error);
    return null;
  }
};

// Helper to save processed message IDs to localStorage
export const saveProcessedIds = (ids: Set<string>) => {
  localStorage.setItem("processedMessageIds", JSON.stringify(Array.from(ids)));
};

// Helper to load processed message IDs from localStorage
export const loadProcessedIds = (): Set<string> => {
  try {
    const savedIds = localStorage.getItem("processedMessageIds");
    return savedIds ? new Set(JSON.parse(savedIds)) : new Set();
  } catch (e) {
    console.error("Error loading processed IDs from localStorage:", e);
    return new Set();
  }
};
