import { randomUUID } from "crypto";

import { assert } from "../../utils/http.js";
import { db } from "../db/db.service.js";
import { parseDueDate } from "./due.js";

const MAX_TEXT_LENGTH = 500;
const MAX_REMINDERS = 500;
export const MAX_SNOOZE_MINUTES = 7 * 24 * 60;

const toReminder = (row) => ({
  id: row.id,
  text: row.text,
  createdAt: row.created_at,
  completed: Boolean(row.completed),
  completedAt: row.completed_at ?? null,
  dueAt: row.due_at ?? null,
  notifiedAt: row.notified_at ?? null,
  repeat: row.repeat_rule ?? null,
});

const selectAll = db.prepare("SELECT * FROM reminders ORDER BY rowid");
const selectOne = db.prepare("SELECT * FROM reminders WHERE id = ?");
const countAll = db.prepare("SELECT COUNT(*) AS total FROM reminders");
const insert = db.prepare(`
  INSERT INTO reminders (id, text, created_at, completed, completed_at, due_at, notified_at, repeat_rule)
  VALUES (?, ?, ?, 0, NULL, ?, NULL, ?)
`);
const updateState = db.prepare(
  "UPDATE reminders SET completed = ?, completed_at = ?, due_at = ?, notified_at = ? WHERE id = ?"
);
const updateNotified = db.prepare("UPDATE reminders SET notified_at = ? WHERE id = ?");
const updateRecurring = db.prepare(
  "UPDATE reminders SET due_at = ?, notified_at = NULL WHERE id = ?"
);
const updateSnoozed = db.prepare(
  "UPDATE reminders SET due_at = ?, notified_at = NULL, completed = 0, completed_at = NULL WHERE id = ?"
);
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

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

// The next occurrence after now, so a reminder that was missed while the API
// was off fires once and then moves on instead of announcing old dates.
const nextOccurrence = (dueAt, repeat, now) => {
  const step = repeat === "weekly" ? 7 : 1;
  let next = new Date(dueAt);

  if (Number.isNaN(next.getTime())) {
    return null;
  }

  do {
    next = addDays(next, step);
  } while (next <= now);

  return next;
};

export const addReminder = (text) => {
  assert(
    typeof text === "string" && text.trim().length > 0,
    400,
    "Reminder text is required"
  );

  assert(text.trim().length <= MAX_TEXT_LENGTH, 400, "That reminder is too long");

  assert(countAll.get().total < MAX_REMINDERS, 409, "Too many reminders. Delete a few first.");

  const { dueAt, text: cleaned, repeat } = parseDueDate(text);

  const reminder = {
    id: randomUUID(),
    text: cleaned || text.trim(),
    createdAt: new Date().toISOString(),
    dueAt: dueAt ? dueAt.toISOString() : null,
    repeat,
  };

  insert.run(
    reminder.id,
    reminder.text,
    reminder.createdAt,
    reminder.dueAt,
    reminder.repeat
  );

  return toReminder(selectOne.get(reminder.id));
};

export const getReminders = () => selectAll.all().map(toReminder);

export const setCompleted = (id, completed) => {
  assert(typeof completed === "boolean", 400, "Completed must be true or false");

  const row = findOrFail(id);
  const now = new Date();
  let dueAt = row.due_at;
  let notifiedAt = row.notified_at;

  // Reopening a recurring reminder that already fired should wait for the next
  // occurrence instead of announcing the missed one immediately.
  if (!completed && row.repeat_rule && dueAt && new Date(dueAt) <= now) {
    const next = nextOccurrence(dueAt, row.repeat_rule, now);

    if (next) {
      dueAt = next.toISOString();
      notifiedAt = null;
    }
  }

  updateState.run(
    completed ? 1 : 0,
    completed ? now.toISOString() : null,
    dueAt,
    notifiedAt,
    id
  );

  return toReminder(selectOne.get(id));
};

// Moves the due time forward and clears the sent flag, so the reminder can fire
// again. A snoozed reminder is always open again.
export const snoozeReminder = (id, minutes) => {
  assert(
    Number.isInteger(minutes) && minutes > 0 && minutes <= MAX_SNOOZE_MINUTES,
    400,
    `Snooze must be between 1 and ${MAX_SNOOZE_MINUTES} minutes`
  );

  findOrFail(id);

  const dueAt = new Date(Date.now() + minutes * 60_000).toISOString();

  updateSnoozed.run(dueAt, id);

  return toReminder(selectOne.get(id));
};

// Marks every reminder that is due and not yet announced, so the scheduler
// never shows the same reminder twice. Recurring reminders keep their row and
// move to the next occurrence instead. Returns the ones that were announced.
export const markDueNotified = (now = new Date()) => {
  const stamp = now.toISOString();
  const due = selectDue.all(stamp);

  due.forEach((row) => {
    const repeating = row.repeat_rule === "daily" || row.repeat_rule === "weekly";
    const next = repeating ? nextOccurrence(row.due_at, row.repeat_rule, now) : null;

    if (next) {
      updateRecurring.run(next.toISOString(), row.id);
    } else {
      updateNotified.run(stamp, row.id);
    }
  });

  return due.map((row) => toReminder({ ...row, notified_at: stamp }));
};

export const deleteReminder = (id) => {
  const row = findOrFail(id);

  remove.run(id);

  return toReminder(row);
};
