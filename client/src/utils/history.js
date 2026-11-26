const STORAGE_KEY = "orbit-chat-history";
const MAX_ENTRIES = 50;
const CHANGE_EVENT = "orbit:history-changed";

export const getChatHistory = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveChatHistory = (chat) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chat.slice(-MAX_ENTRIES)));
  } catch {
    // storage unavailable or full; the conversation stays in memory
  }
};

export const clearChatHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const onChatHistoryCleared = (handler) => {
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
};
