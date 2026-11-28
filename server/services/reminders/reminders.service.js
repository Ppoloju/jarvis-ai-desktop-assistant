import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

import { assert } from "../../utils/http.js";
import { parseDueDate } from "./due.js";

const dataDir = process.env.ORBIT_DATA_DIR || path.join(import.meta.dirname, "../..");
const storageDir = path.join(dataDir, "storage");
const remindersFile = path.join(storageDir, "reminders.json");

const MAX_TEXT_LENGTH = 500;
const MAX_REMINDERS = 500;

// Keep a damaged file instead of silently overwriting it on the next save.
const preserveCorruptFile = () => {
  try {
    fs.renameSync(remindersFile, `${remindersFile}.corrupt-${Date.now()}`);
  } catch {
    // Nothing else can be done; the app still has to start.
  }
};

const load = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(remindersFile, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      preserveCorruptFile();
    }

    return [];
  }
};

const normalize = (reminder) => ({
  ...reminder,
  completed: Boolean(reminder.completed),
  dueAt: reminder.dueAt ?? null,
  notifiedAt: reminder.notifiedAt ?? null,
});

let reminders = load()
  .filter((reminder) => reminder && typeof reminder.text === "string")
  .map(normalize);

const save = () => {
  fs.mkdirSync(storageDir, { recursive: true });

  // Write to a temporary file first so a crash cannot truncate the list
  const temporaryFile = `${remindersFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(reminders, null, 2));
  fs.renameSync(temporaryFile, remindersFile);
};

export const addReminder = (text) => {
  assert(
    typeof text === "string" && text.trim().length > 0,
    400,
    "Reminder text is required"
  );

  assert(text.trim().length <= MAX_TEXT_LENGTH, 400, "That reminder is too long");

  assert(reminders.length < MAX_REMINDERS, 409, "Too many reminders. Delete a few first.");

  const { dueAt, text: cleaned } = parseDueDate(text);

  const reminder = {
    id: randomUUID(),
    text: cleaned || text.trim(),
    createdAt: new Date().toISOString(),
    completed: false,
    completedAt: null,
    dueAt: dueAt ? dueAt.toISOString() : null,
    notifiedAt: null,
  };

  reminders.push(reminder);
  save();

  return reminder;
};

export const getReminders = () => reminders.map((reminder) => ({ ...reminder }));

export const setCompleted = (id, completed) => {
  assert(typeof completed === "boolean", 400, "Completed must be true or false");

  const reminder = reminders.find((item) => item.id === id);

  assert(reminder, 404, "Reminder not found");

  reminder.completed = completed;
  reminder.completedAt = completed ? new Date().toISOString() : null;
  save();

  return { ...reminder };
};

// Marks every reminder that is due and not yet announced, so the scheduler
// never shows the same reminder twice. Returns the ones it announced.
export const markDueNotified = (now = new Date()) => {
  const fired = reminders.filter(
    (reminder) =>
      reminder.dueAt &&
      !reminder.completed &&
      !reminder.notifiedAt &&
      new Date(reminder.dueAt) <= now
  );

  if (fired.length === 0) {
    return [];
  }

  const stamp = now.toISOString();

  fired.forEach((reminder) => {
    reminder.notifiedAt = stamp;
  });

  save();

  return fired.map((reminder) => ({ ...reminder }));
};

export const deleteReminder = (id) => {
  const index = reminders.findIndex((reminder) => reminder.id === id);

  assert(index !== -1, 404, "Reminder not found");

  const [removed] = reminders.splice(index, 1);
  save();

  return removed;
};
