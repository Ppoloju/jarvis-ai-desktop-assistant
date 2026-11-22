import * as reminders from "../reminders/reminders.service.js";
import * as files from "../files/files.service.js";
import * as automation from "../automation/automation.service.js";
import { getSystemInfo } from "../system/system.service.js";

const CAPABILITIES = [
  ["Time and date", "what time is it"],
  ["System status", "system info"],
  ["Reminders", "remind me to call Sam"],
  ["Your reminders", "list my reminders"],
  ["Stored files", "list files"],
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
];

const formatBytes = (bytes) => {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
};

const listFilesReply = async () => {
  const entries = await files.listFiles();

  if (entries.length === 0) {
    return { reply: "Your storage is empty. Create a file or folder from the Files page." };
  }

  const lines = entries
    .slice(0, 15)
    .map((entry) => `- ${entry.type === "folder" ? "📁" : "📄"} ${entry.name}`)
    .join("\n");

  const extra = entries.length > 15 ? `\n...and ${entries.length - 15} more.` : "";

  return { reply: `You have ${entries.length} item(s) in storage:\n${lines}${extra}` };
};

const remindersReply = () => {
  const list = reminders.getReminders();

  if (list.length === 0) {
    return {
      reply: 'You have no reminders yet. Say "remind me to ..." or add one on the Reminders page.',
    };
  }

  const lines = list.map((reminder, index) => `${index + 1}. ${reminder.text}`).join("\n");

  return { reply: `You have ${list.length} reminder(s):\n${lines}` };
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
        "Hello! I am Jarvis, your local desktop assistant. I can check the time, report system status, manage reminders, list stored files and launch apps.",
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

  const addReminder = text.match(/^(?:remind me to|add (?:a )?reminder:?)\s+(.+)$/i);

  if (addReminder) {
    const reminder = reminders.addReminder(addReminder[1]);

    return { reply: `Added reminder: ${reminder.text}` };
  }

  if (/reminder/.test(lower)) {
    return remindersReply();
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
