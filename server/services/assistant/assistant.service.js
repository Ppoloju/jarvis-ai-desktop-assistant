import * as reminders from "../reminders/reminders.service.js";
import * as files from "../files/files.service.js";
import * as laptop from "../laptop/laptop.service.js";
import * as automation from "../automation/automation.service.js";
import { getSystemInfo } from "../system/system.service.js";

const CAPABILITIES = [
  ["Time and date", "what time is it"],
  ["System status", "system info"],
  ["Reminders", "remind me to call Sam"],
  ["Your reminders", "list my reminders"],
  ["Stored files", "list files"],
  ["Read a stored file", "read notes.txt"],
  ["Your folders", "what's in my downloads"],
  ["Automation", "open calculator"],
  ["Websites", "open google.com"],
];

const HELP_LINES = CAPABILITIES.map(([label, example]) => `- ${label}: "${example}"`).join("\n");

const helpReply = () => ({
  reply: `I can help with:\n${HELP_LINES}\n\nAsk in plain English, or tap a suggestion below.`,
});

const SUGGESTED_FALLBACK = [
  "what time is it",
  "system info",
  "list my reminders",
  "list files",
  "what's in my downloads",
];

const count = (value, word) => `${value} ${word}${value === 1 ? "" : "s"}`;

const formatBytes = (bytes) => {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
};

const formatSize = (bytes) => {
  if (bytes === null || bytes === undefined) return "-";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(1)} ${units[unit]}`;
};

const listFilesReply = async () => {
  const entries = await files.listFiles();

  if (entries.length === 0) {
    return { reply: "Your storage is empty. Create a file or folder from the Files page." };
  }

  const lines = entries
    .slice(0, 15)
    .map((entry) => `- ${entry.type === "folder" ? "Folder:" : "File:"} ${entry.name}`)
    .join("\n");

  const extra = entries.length > 15 ? `\n...and ${entries.length - 15} more.` : "";

  return { reply: `You have ${count(entries.length, "item")} in storage:\n${lines}${extra}` };
};

const LAPTOP_FOLDERS = [
  { key: "desktop", pattern: /\bdesktop\b/i },
  { key: "documents", pattern: /\b(documents?|docs)\b/i },
  { key: "downloads", pattern: /\bdownloads?\b/i },
];

const BROWSE_WORDS =
  /\b(what'?s? in|what is in|anything in|contents?|inside|list|show|browse|files?|folders?)\b/i;

const laptopReply = async (text) => {
  const folder = LAPTOP_FOLDERS.find((item) => item.pattern.test(text));

  if (!folder || !BROWSE_WORDS.test(text)) {
    return null;
  }

  const subPathMatch = text.match(
    /\b(?:desktop|documents?|docs|downloads?)\s*(?:folder)?\s*(?:\/|\\|>)\s*([^?\n]+)/i
  );
  const subPath = subPathMatch ? subPathMatch[1].trim().replace(/[.!?,;:'"]+$/, "") : "";

  try {
    const listing = await laptop.listFolder(folder.key, subPath);
    const label = [listing.label, ...listing.segments].join(" / ");

    if (listing.entries.length === 0) {
      return { reply: `${label} is empty. This is a read-only view of your computer.` };
    }

    const lines = listing.entries
      .slice(0, 15)
      .map((entry) =>
        entry.type === "folder"
          ? `- Folder: ${entry.name}`
          : `- File: ${entry.name} (${formatSize(entry.size)})`
      )
      .join("\n");

    const extra =
      listing.entries.length > 15 ? `\n...and ${listing.entries.length - 15} more.` : "";
    const truncated = listing.truncated ? " Only the first 500 entries are shown." : "";

    return {
      reply: `${label} has ${count(listing.entries.length, "item")}:\n${lines}${extra}${truncated}\n\nThis is a read-only view, so nothing there can be changed from chat.`,
    };
  } catch (error) {
    return { reply: `I could not read ${folder.key}: ${error.message}` };
  }
};

const remindersReply = () => {
  const list = reminders.getReminders();

  if (list.length === 0) {
    return {
      reply: 'You have no reminders yet. Say "remind me to ..." or add one on the Reminders page.',
    };
  }

  const open = list.filter((reminder) => !reminder.completed).length;
  const lines = list
    .map((reminder, index) => `${index + 1}. ${reminder.completed ? "[done] " : ""}${reminder.text}`)
    .join("\n");

  return { reply: `You have ${count(list.length, "reminder")} (${open} open):\n${lines}` };
};

const readFileReply = async (name) => {
  try {
    const file = await files.readFile(name);
    const content = file.content.trim();
    const preview = content.length > 2000 ? `${content.slice(0, 2000)}\n...` : content;

    return {
      reply: `${file.name} (${formatSize(file.size)}):\n\n${preview || "(This file is empty.)"}`,
    };
  } catch (error) {
    return { reply: `I could not read that file: ${error.message}` };
  }
};

const systemReply = () => {
  const info = getSystemInfo();
  const total = info.totalMemoryBytes ? formatBytes(info.totalMemoryBytes) : info.totalMemory;

  return {
    reply: [
      `Platform: ${info.platform}`,
      `CPU cores: ${info.cpuCount}`,
      `Memory: ${info.freeMemory} free of ${total}`,
      `Uptime: ${info.uptime}`,
    ].join("\n"),
  };
};

const automationReply = async (target) => {
  const supported = ["chrome", "vscode", "calculator"];
  const normalized = target.replace(/^(the|my)\s+/i, "").replace(/[.!?]+$/, "").trim();

  if (supported.includes(normalized.toLowerCase())) {
    try {
      await automation.launchApp(normalized);
      return { reply: `Launching ${normalized}.` };
    } catch (error) {
      return { reply: error.message };
    }
  }

  const looksLikeUrl =
    /^(https?:\/\/|www\.)/i.test(normalized) || /^[a-z0-9-]+(\.[a-z]{2,})+(\/\S*)?$/i.test(normalized);

  if (looksLikeUrl) {
    try {
      const opened = await automation.launchWebsite(normalized);
      return { reply: `Opening ${opened}` };
    } catch (error) {
      return { reply: error.message };
    }
  }

  return {
    reply: `I cannot open "${normalized}" yet. I can launch chrome, vscode or calculator, or open a website like google.com.`,
  };
};

export const reply = async (message) => {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (/^(hi|hello|hey|yo|hola)\b/.test(lower) || /^good (morning|afternoon|evening)\b/.test(lower)) {
    return {
      reply:
        "Hello! I am Orbit, your local desktop assistant. I can check the time, report system status, manage reminders, list stored files, read your Desktop, Documents and Downloads, and launch apps.",
    };
  }

  if (/how are you|how is it going|how's it going/.test(lower)) {
    return { reply: "Running smoothly and fully local. What can I do for you?" };
  }

  if (/^(thanks|thank you|thx|cheers)\b/.test(lower)) {
    return { reply: "Anytime. Anything else?" };
  }

  if (/^(bye|goodbye|see you|later)\b/.test(lower)) {
    return { reply: "Goodbye! Your conversation is saved to History." };
  }

  if (/^(help|commands|what can you do|capabilities)\b/.test(lower)) {
    return helpReply();
  }

  const addReminder = text.match(/^(?:remind me to|add (?:a )?reminder:?)\s+(.+)$/i);

  if (addReminder) {
    const reminder = reminders.addReminder(addReminder[1]);

    return { reply: `Added reminder: ${reminder.text}` };
  }

  if (/reminder/.test(lower)) {
    return remindersReply();
  }

  if (/\btime\b/.test(lower)) {
    return { reply: `The time is ${new Date().toLocaleTimeString()}.` };
  }

  if (/\b(date|today)\b/.test(lower) || /what day is it/.test(lower)) {
    return {
      reply: `Today is ${new Date().toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}.`,
    };
  }

  if (/\b(system|memory|ram|cpu|uptime|status)\b/.test(lower)) {
    return systemReply();
  }

  const laptopAnswer = await laptopReply(text);

  if (laptopAnswer) {
    return laptopAnswer;
  }

  const readMatch = text.match(/^(?:read|cat|preview|open file|show file)\s+(.+)$/i);

  if (readMatch) {
    return readFileReply(readMatch[1].replace(/^["']|["']$/g, "").trim());
  }

  if (/\bfiles?\b|\bstorage\b/.test(lower)) {
    return listFilesReply();
  }

  const openMatch = text.match(/^(?:open|launch|start|go to)\s+(.+)$/i);

  if (openMatch) {
    return automationReply(openMatch[1]);
  }

  return {
    reply: `I am not sure how to help with "${text}" yet.\n\nTry one of these: ${SUGGESTED_FALLBACK.map(
      (item) => `"${item}"`
    ).join(", ")}.`,
  };
};
