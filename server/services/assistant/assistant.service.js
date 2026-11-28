import * as reminders from "../reminders/reminders.service.js";
import { dueLabel } from "../reminders/due.js";
import * as files from "../files/files.service.js";
import * as laptop from "../laptop/laptop.service.js";
import * as automation from "../automation/automation.service.js";
import { getSystemInfo } from "../system/system.service.js";
import * as memory from "../ai/memory.service.js";
import * as ai from "../ai/ai.service.js";

const CAPABILITIES = [
  ["Time and date", "what time is it"],
  ["System status", "system info"],
  ["Find a file", "find report.pdf"],
  ["Open a found file", "open the first one"],
  ["Your folders", "what's in my downloads"],
  ["Websites", "open youtube"],
  ["Web search", "search the web for espresso"],
  ["Reminders", "remind me to call Sam"],
  ["Timed reminder", "remind me to stretch in 20 minutes"],
  ["Your reminders", "list my reminders"],
  ["Stored files", "list files"],
  ["Read a stored file", "read notes.txt"],
  ["Automation", "open calculator"],
  ["An installed app", "open spotify"],
];

const HELP_LINES = CAPABILITIES.map(([label, example]) => `- ${label}: "${example}"`).join("\n");

const helpReply = () => ({
  reply: `I can help with:\n${HELP_LINES}\n\nAsk in plain English, or tap a suggestion below.`,
});

const SUGGESTED_FALLBACK = [
  "what time is it",
  "system info",
  "find report.pdf",
  "list my reminders",
  "what's in my downloads",
];

// Friendly site names so "open youtube" works without a full address
const SITE_ALIASES = {
  youtube: "https://www.youtube.com",
  google: "https://www.google.com",
  github: "https://github.com",
  gmail: "https://mail.google.com",
  maps: "https://maps.google.com",
  "google maps": "https://maps.google.com",
  reddit: "https://www.reddit.com",
  chatgpt: "https://chatgpt.com",
  twitter: "https://x.com",
  x: "https://x.com",
  stackoverflow: "https://stackoverflow.com",
  "stack overflow": "https://stackoverflow.com",
  linkedin: "https://www.linkedin.com",
  netflix: "https://www.netflix.com",
  spotify: "https://open.spotify.com",
  instagram: "https://www.instagram.com",
  facebook: "https://www.facebook.com",
  whatsapp: "https://web.whatsapp.com",
  amazon: "https://www.amazon.com",
  wikipedia: "https://www.wikipedia.org",
  news: "https://news.google.com",
};

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

// The last file search, so "open the file" / "open the first one" has something to act on
let lastSearch = { query: "", matches: [] };

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

const findFilesReply = (query) => {
  const cleaned = query
    .replace(/^(?:the|a|an|my)\s+/i, "")
    .replace(/[.!?,;:'"]+$/, "")
    .trim();

  if (cleaned.length < 2) {
    return {
      reply: 'Tell me what to look for, for example "find report.pdf".',
    };
  }

  try {
    const matches = laptop.searchEntries(cleaned);
    lastSearch = { query: cleaned, matches };

    if (matches.length === 0) {
      return {
        reply: `I could not find a file matching "${cleaned}" in Desktop, Documents or Downloads.`,
      };
    }

    const lines = matches
      .map(
        (match, index) =>
          `${index + 1}. ${match.name} — ${match.folder} (${formatSize(match.size)})`
      )
      .join("\n");

    return {
      reply: `Found ${count(matches.length, "file")} matching "${cleaned}":\n${lines}\n\nSay "open the file" or "open the first one" to open one of them.`,
    };
  } catch (error) {
    return { reply: error.message };
  }
};

const ORDINALS = {
  first: 0,
  "1st": 0,
  second: 1,
  "2nd": 1,
  third: 2,
  "3rd": 2,
  fourth: 3,
  "4th": 3,
  fifth: 4,
  "5th": 4,
};

const openFoundReply = async (text) => {
  if (lastSearch.matches.length === 0) {
    return null;
  }

  const lowerText = text.toLowerCase().trim();
  let index;

  if (
    /^(?:open|launch)\s+(?:it|that|this|the file|that file|this file|the result|that result)$/.test(
      lowerText
    )
  ) {
    index = 0;
  } else {
    const match = lowerText.match(
      /^(?:open|launch)\s+(?:the\s+)?(?:number\s+)?(first|second|third|fourth|fifth|last|\d+)(?:\s+(?:one|file|result|match))?$/
    );

    if (!match) {
      return null;
    }

    if (match[1] === "last") {
      index = lastSearch.matches.length - 1;
    } else if (ORDINALS[match[1]] !== undefined) {
      index = ORDINALS[match[1]];
    } else {
      index = Number(match[1]) - 1;
    }
  }

  const target = lastSearch.matches[index];

  if (!target) {
    return {
      reply: `My last search for "${lastSearch.query}" has ${count(
        lastSearch.matches.length,
        "match"
      )}. Say "open the first one".`,
    };
  }

  try {
    await automation.openFile(target.path);
    return { reply: `Opening ${target.name} from ${target.folder}.` };
  } catch (error) {
    return { reply: error.message };
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
    .map((reminder, index) => {
      const due = reminder.dueAt
        ? ` (due ${dueLabel(reminder.dueAt)}${reminder.notifiedAt ? ", sent" : ""})`
        : "";

      return `${index + 1}. ${reminder.completed ? "[done] " : ""}${reminder.text}${due}`;
    })
    .join("\n");

  return { reply: `You have ${count(list.length, "reminder")} (${open} open):\n${lines}` };
};

const findReminder = (target) => {
  const list = reminders.getReminders();
  const trimmed = target.trim().replace(/^["']|["']$/g, "");

  if (/^\d+$/.test(trimmed)) {
    return list[Number(trimmed) - 1] || null;
  }

  const needle = trimmed.toLowerCase();

  return list.find((reminder) => reminder.text.toLowerCase().includes(needle)) || null;
};

const completeReminderReply = (target) => {
  const reminder = findReminder(target);

  if (!reminder) {
    return { reply: `I could not find a reminder matching "${target}". Say "list my reminders".` };
  }

  reminders.setCompleted(reminder.id, true);

  return { reply: `Marked done: ${reminder.text}` };
};

const deleteReminderReply = (target) => {
  const reminder = findReminder(target);

  if (!reminder) {
    return { reply: `I could not find a reminder matching "${target}". Say "list my reminders".` };
  }

  reminders.deleteReminder(reminder.id);

  return { reply: `Deleted reminder: ${reminder.text}` };
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

const systemReply = async () => {
  const info = await getSystemInfo();
  const total = info.totalMemoryBytes ? formatBytes(info.totalMemoryBytes) : info.totalMemory;
  const battery = info.battery?.available
    ? `${info.battery.percentage}%${
        info.battery.charging ? " (charging)" : info.battery.pluggedIn ? " (plugged in)" : ""
      }`
    : "not detected";

  return {
    reply: [
      `Platform: ${info.platform}`,
      `CPU cores: ${info.cpuCount}`,
      `Memory: ${info.freeMemory} free of ${total}`,
      `Uptime: ${info.uptime}`,
      `Battery: ${battery}`,
    ].join("\n"),
  };
};

const automationReply = async (target) => {
  const normalized = target
    .replace(/^(the|my|a)\s+/i, "")
    .replace(/[.!?]+$/, "")
    .trim();

  // An installed app wins over the matching website: "open spotify" should
  // launch the desktop app when there is one, and fall back to the site when not.
  if (automation.resolveAppName(normalized)) {
    try {
      const label = await automation.launchApp(normalized);
      return { reply: `Launching ${label}.` };
    } catch (error) {
      return { reply: error.message };
    }
  }

  const siteName = normalized.toLowerCase().replace(/\s+(?:website|site|page)$/i, "");

  if (SITE_ALIASES[siteName]) {
    try {
      const opened = await automation.launchWebsite(SITE_ALIASES[siteName]);
      return { reply: `Opening ${opened}` };
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
    reply: `I cannot open "${normalized}" yet. I can launch chrome, vscode, calculator or an app installed on this computer (try "open spotify"), open a website like google.com or youtube, or open a file I found with "find ...".`,
  };
};

const COMMAND_EXAMPLES = SUGGESTED_FALLBACK.map((item) => `"${item}"`).join(", ");

// Anything the command list does not cover becomes a normal conversation; without
// an API key the assistant explains what it can still do instead of guessing.
const fallbackReply = async (text) => {
  if (!ai.isConfigured()) {
    return {
      reply: `I do not have a matching command for "${text}" yet.\n\nTry one of these: ${COMMAND_EXAMPLES}.\n\nTo chat about anything, add an AI key (see the README) and try again.`,
      source: "commands",
    };
  }

  try {
    return { reply: await ai.answer(text), source: "ai" };
  } catch (error) {
    return {
      reply: `I could not reach the AI service: ${error.message}. Your commands still work.`,
      source: "error",
    };
  }
};

const route = async (message) => {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (/^(hi|hello|hey|yo|hola)\b/.test(lower) || /^good (morning|afternoon|evening)\b/.test(lower)) {
    return {
      reply:
        'Hello! I am Orbit, your local desktop assistant. I can open websites, find and open files on your computer, keep reminders, check system status and more. Try "find report.pdf" or "open youtube".',
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
    const when = reminder.dueAt
      ? ` I will remind you ${dueLabel(reminder.dueAt)} with a desktop notification.`
      : "";

    return { reply: `Added reminder: ${reminder.text}.${when}` };
  }

  const completeMatch =
    text.match(
      /^(?:complete|finish|check\s*off|done\s+with)\s+(?:the\s+)?reminder\s+(.+)$/i
    ) ||
    text.match(
      /^(?:mark|set)\s+(?:the\s+)?reminder\s+(.+?)\s+(?:as\s+)?(?:done|complete|completed)$/i
    );

  if (completeMatch) {
    return completeReminderReply(completeMatch[1]);
  }

  const deleteMatch = text.match(/^(?:delete|remove)\s+(?:the\s+)?reminder\s+(.+)$/i);

  if (deleteMatch) {
    return deleteReminderReply(deleteMatch[1]);
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

  if (/\b(system|memory|ram|cpu|uptime|status|battery|charge)\b/.test(lower)) {
    return systemReply();
  }

  const laptopAnswer = await laptopReply(text);

  if (laptopAnswer) {
    return laptopAnswer;
  }

  const openedFound = await openFoundReply(text);

  if (openedFound) {
    return openedFound;
  }

  const readMatch = text.match(/^(?:read|cat|preview|open stored|show stored)\s+(.+)$/i);

  if (readMatch) {
    return readFileReply(readMatch[1].replace(/^["']|["']$/g, "").trim());
  }

  if (/\bfiles?\b|\bstorage\b/.test(lower) && !/\b(find|locate|look for)\b/.test(lower)) {
    return listFilesReply();
  }

  const webSearchMatch = text.match(
    /^(?:search\s+(?:the\s+)?(?:web|internet|google)(?:\s+for)?|google|look\s+up)\s+(.+)$/i
  );

  if (webSearchMatch) {
    try {
      await automation.openWebSearch(webSearchMatch[1]);
      return { reply: `Searching the web for "${webSearchMatch[1].trim()}" in your browser.` };
    } catch (error) {
      return { reply: error.message };
    }
  }

  const findMatch = text.match(
    /^(?:find|locate|search(?:\s+for)?|look\s+for|where\s+is)\s+(?:me\s+)?(.+)$/i
  );

  if (findMatch) {
    return findFilesReply(findMatch[1]);
  }

  const openMatch = text.match(/^(?:open|launch|start|go to)\s+(.+)$/i);

  if (openMatch) {
    return automationReply(openMatch[1]);
  }

  return fallbackReply(text);
};

// Every message and answer is remembered, so follow-up questions have context.
export const reply = async (message) => {
  const answer = await route(message);

  memory.addTurn("user", message);
  memory.addTurn("assistant", answer.reply);

  return answer;
};

export const clearMemory = () => memory.clearTurns();

export const aiStatus = () => ai.describe();
