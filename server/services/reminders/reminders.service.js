import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

import { assert } from "../../utils/http.js";

const dataDir = process.env.ORBIT_DATA_DIR || path.join(import.meta.dirname, "../..");
const storageDir = path.join(dataDir, "storage");
const remindersFile = path.join(storageDir, "reminders.json");

const load = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(remindersFile, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

let reminders = load().map((reminder) => ({ ...reminder, completed: Boolean(reminder.completed) }));

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

  const reminder = {
    id: randomUUID(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
    completed: false,
    completedAt: null,
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

export const deleteReminder = (id) => {
  const index = reminders.findIndex((reminder) => reminder.id === id);

  assert(index !== -1, 404, "Reminder not found");

  const [removed] = reminders.splice(index, 1);
  save();

  return removed;
};
