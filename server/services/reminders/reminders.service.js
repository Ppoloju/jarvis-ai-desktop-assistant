import { randomUUID } from "crypto";

import { assert } from "../../utils/http.js";
import { db } from "../db/db.service.js";
import { parseDueDate } from "./due.js";

const MAX_TEXT_LENGTH = 500;
const MAX_REMINDERS = 500;

const toReminder = (row) => ({
  id: row.id,
  text: row.text,
  createdAt: row.created_at,
  completed: Boolean(row.completed),
  completedAt: row.completed_at ?? null,
  dueAt: row.due_at ?? null,
  notifiedAt: row.notified_at ?? null,
});

const selectAll = db.prepare("SELECT * FROM reminders ORDER BY rowid");
const selectOne = db.prepare("SELECT * FROM reminders WHERE id = ?");
const countAll = db.prepare("SELECT COUNT(*) AS total FROM reminders");
const insert = db.prepare(`
  INSERT INTO reminders (id, text, created_at, completed, completed_at, due_at, notified_at)
  VALUES (?, ?, ?, 0, NULL, ?, NULL)
`);
const updateCompleted = db.prepare(
  "UPDATE reminders SET completed = ?, completed_at = ? WHERE id = ?"
);
const updateNotified = db.prepare("UPDATE reminders SET notified_at = ? WHERE id = ?");
const remove = db.prepare("DELETE FROM reminders WHERE id = ?");
const selectDue = db.prepare(`
  SELECT * FROM reminders
  WHERE due_at IS NOT NULL AND completed = 0 AND notified_at IS NULL AND due_at <= ?
  ORDER BY due_at
`);

const findOrFail = (id) => {
  const row = selectOne.get(id);

  assert(row, 404, "Reminder not found");

  return row;
};

export const addReminder = (text) => {
  assert(
    typeof text === "string" && text.trim().length > 0,
    400,
    "Reminder text is required"
  );

  assert(text.trim().length <= MAX_TEXT_LENGTH, 400, "That reminder is too long");

  assert(countAll.get().total < MAX_REMINDERS, 409, "Too many reminders. Delete a few first.");

  const { dueAt, text: cleaned } = parseDueDate(text);

  const reminder = {
    id: randomUUID(),
    text: cleaned || text.trim(),
    createdAt: new Date().toISOString(),
    dueAt: dueAt ? dueAt.toISOString() : null,
  };

  insert.run(reminder.id, reminder.text, reminder.createdAt, reminder.dueAt);

  return toReminder(selectOne.get(reminder.id));
};

export const getReminders = () => selectAll.all().map(toReminder);

export const setCompleted = (id, completed) => {
  assert(typeof completed === "boolean", 400, "Completed must be true or false");

  findOrFail(id);

  updateCompleted.run(completed ? 1 : 0, completed ? new Date().toISOString() : null, id);

  return toReminder(selectOne.get(id));
};

// Marks every reminder that is due and not yet announced, so the scheduler
// never shows the same reminder twice. Returns the ones it announced.
export const markDueNotified = (now = new Date()) => {
  const stamp = now.toISOString();
  const due = selectDue.all(stamp);

  due.forEach((row) => updateNotified.run(stamp, row.id));

  return due.map((row) => toReminder({ ...row, notified_at: stamp }));
};

export const deleteReminder = (id) => {
  const row = findOrFail(id);

  remove.run(id);

  return toReminder(row);
};
