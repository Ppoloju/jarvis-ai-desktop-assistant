const STORAGE_KEY = "jarvis-chat-history";
const MAX_ENTRIES = 50;

export const getChatHistory = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const saveChatHistory = (chat) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(chat.slice(-MAX_ENTRIES))
    );
  } catch {
    // storage unavailable or full, history stays in memory
  }
};
