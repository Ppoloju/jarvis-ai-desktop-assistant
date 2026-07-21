const API_BASE = "http://localhost:5000";

// Chat API
export const sendMessage = async (message) => {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return response.json();
};

// Automation API
export const openWebsite = async (url) => {
  const response = await fetch(`${API_BASE}/api/automation/open-website`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return response.json();
};

export const openApp = async (app) => {
  const response = await fetch(`${API_BASE}/api/automation/open-app`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app }),
  });
  return response.json();
};

export const captureScreenshot = async () => {
  const response = await fetch(`${API_BASE}/api/automation/screenshot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
};

// System API
export const getSystemInfo = async () => {
  const response = await fetch(`${API_BASE}/api/system/info`);
  return response.json();
};

// Files API
export const createFolder = async (folderName) => {
  const response = await fetch(`${API_BASE}/api/files/create-folder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderName }),
  });
  return response.json();
};

export const createFile = async (fileName, content) => {
  const response = await fetch(`${API_BASE}/api/files/create-file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, content }),
  });
  return response.json();
};

export const renameFile = async (oldName, newName) => {
  const response = await fetch(`${API_BASE}/api/files/rename-file`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldName, newName }),
  });
  return response.json();
};

export const deleteFile = async (fileName) => {
  const response = await fetch(`${API_BASE}/api/files/delete-file`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName }),
  });
  return response.json();
};

// Reminders API
export const createReminder = async (text) => {
  const response = await fetch(`${API_BASE}/api/reminders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return response.json();
};

export const getReminders = async () => {
  const response = await fetch(`${API_BASE}/api/reminders`);
  return response.json();
};

export const deleteReminder = async (id) => {
  const response = await fetch(`${API_BASE}/api/reminders/${id}`, {
    method: "DELETE",
  });
  return response.json();
};

export default API_BASE;