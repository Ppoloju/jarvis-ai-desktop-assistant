import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

import { assert } from "../../utils/http.js";

const dataDir = process.env.JARVIS_DATA_DIR || path.join(import.meta.dirname, "../..");
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

let reminders = load();

const save = () => {
  fs.mkdirSync(storageDir, { recursive: true });
  fs.writeFileSync(remindersFile, JSON.stringify(reminders, null, 2));
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
  };

  reminders.push(reminder);
  save();

  return reminder;
};

export const getReminders = () => reminders;

export const deleteReminder = (id) => {
  const index = reminders.findIndex((reminder) => reminder.id === id);

  assert(index !== -1, 404, "Reminder not found");

  const [removed] = reminders.splice(index, 1);
  save();

  return removed;
};
