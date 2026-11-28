const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const request = async (path, options) => {
  const response = await fetch(`${API_BASE}${path}`, options);
  const isJson = (response.headers.get("content-type") || "").includes(
    "application/json"
  );
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }

  return data;
};

const jsonOptions = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const assetUrl = (path) => `${API_BASE}${path}`;

// Chat API
export const sendMessage = async (message) =>
  request("/api/chat", jsonOptions("POST", { message }));

export const clearChatMemory = async () =>
  request("/api/chat/memory", { method: "DELETE" });

// Automation API
export const openWebsite = async (url) =>
  request("/api/automation/open-website", jsonOptions("POST", { url }));

export const openApp = async (app) =>
  request("/api/automation/open-app", jsonOptions("POST", { app }));

export const listInstalledApps = async () => request("/api/automation/apps");

export const captureScreenshot = async () =>
  request("/api/automation/screenshot", { method: "POST" });

export const listScreenshots = async () => request("/api/automation/screenshots");

// System API
export const getSystemInfo = async () => request("/api/system/info");

// Files API
export const listFiles = async () => request("/api/files");

export const readStoredFile = async (fileName) =>
  request(`/api/files/content?name=${encodeURIComponent(fileName)}`);

export const createFolder = async (folderName) =>
  request("/api/files/create-folder", jsonOptions("POST", { folderName }));

export const createFile = async (fileName, content) =>
  request("/api/files/create-file", jsonOptions("POST", { fileName, content }));

export const renameFile = async (oldName, newName) =>
  request("/api/files/rename-file", jsonOptions("PATCH", { oldName, newName }));

export const deleteFile = async (fileName) =>
  request("/api/files/delete-file", jsonOptions("DELETE", { fileName }));

// Laptop folders API (read-only)
export const getLaptopFolders = async () => request("/api/laptop");

export const listLaptopFolder = async (folder, subPath = "") =>
  request(
    `/api/laptop/${encodeURIComponent(folder)}${
      subPath ? `?path=${encodeURIComponent(subPath)}` : ""
    }`
  );

// Reminders API
export const createReminder = async (text) =>
  request("/api/reminders", jsonOptions("POST", { text }));

export const getReminders = async () => request("/api/reminders");

export const setReminderDone = async (id, completed) =>
  request(`/api/reminders/${id}`, jsonOptions("PATCH", { completed }));

export const deleteReminder = async (id) =>
  request(`/api/reminders/${id}`, { method: "DELETE" });

export default API_BASE;
