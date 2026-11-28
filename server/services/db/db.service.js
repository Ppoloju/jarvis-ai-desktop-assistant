import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DatabaseSync } from "node:sqlite";

const dataDir = process.env.ORBIT_DATA_DIR || path.join(import.meta.dirname, "../..");

const storageDir = path.join(dataDir, "storage");
export const dbFile = path.join(storageDir, "orbit.db");

fs.mkdirSync(storageDir, { recursive: true });

// One synchronous connection for the whole process. Orbit is a single-user
// local app, so prepared statements are cheap and there is no pool to manage.
export const db = new DatabaseSync(dbFile);

// WAL survives an abrupt exit better than the default journal.
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    due_at TEXT,
    notified_at TEXT,
    repeat_rule TEXT
  );

  CREATE TABLE IF NOT EXISTS chat_turns (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS reminders_due ON reminders (completed, due_at);
  DROP INDEX IF EXISTS chat_turns_recent;
`);

// Databases created before recurring reminders have no repeat column yet.
const reminderColumns = db
  .prepare("PRAGMA table_info(reminders)")
  .all()
  .map((column) => column.name);

if (!reminderColumns.includes("repeat_rule")) {
  db.exec("ALTER TABLE reminders ADD COLUMN repeat_rule TEXT");
}

// Mirrors the cap in memory.service.js: keep the newest turns only.
const MAX_TURNS = 24;

const warn = (message) => console.warn(`Orbit data import: ${message}`);

// Returns { ok: false } when the file is missing, unreadable or not JSON, so the
// caller can leave it where it is instead of archiving something it never read.
const readJson = (file) => {
  let text;

  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      warn(`could not read ${file} (${error.message})`);
    }

    return { ok: false, data: null };
  }

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (error) {
    warn(`${file} is not valid JSON (${error.message}); leaving it in place`);
    return { ok: false, data: null };
  }
};

// Dates created by this app are canonical ISO strings, but an imported file may
// hold an offset ("+02:00") or a non-date. String comparisons in SQL only work
// on the canonical form, so normalise what comes in; drop what cannot be read.
const isoOrNull = (value, label) => {
  if (value === null || value === undefined) {
    return null;
  }

  const time = Date.parse(value);

  if (Number.isNaN(time)) {
    warn(`ignoring unreadable date ${JSON.stringify(value)} in ${label}`);
    return null;
  }

  return new Date(time).toISOString();
};

const isoOrNow = (value, label) => isoOrNull(value, label) || new Date().toISOString();

// Keep the old file next to the database instead of deleting it outright, and
// never overwrite an archive from an earlier run or the other legacy location.
const archive = (file) => {
  if (!fs.existsSync(file)) {
    return;
  }

  const base = path.join(storageDir, `${path.basename(file)}.migrated`);
  let target = base;
  let attempt = 1;

  while (fs.existsSync(target)) {
    const suffix = attempt === 1 ? `${Date.now()}` : `${Date.now()}-${attempt}`;

    target = `${base}-${suffix}`;
    attempt += 1;
  }

  try {
    fs.renameSync(file, target);
  } catch (error) {
    // The data is already in SQLite, so a stuck archive must not stop startup.
    warn(`could not archive ${file} (${error.message})`);
  }
};

const insertMany = (statement, rows) => {
  db.exec("BEGIN");

  try {
    rows.forEach((row) => statement.run(...row));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};

// Older versions kept reminders and chat memory as JSON files. Import them once
// so an upgrade keeps every reminder and remembered turn.
const migrateReminders = () => {
  const legacy = path.join(storageDir, "reminders.json");

  if (!fs.existsSync(legacy)) {
    return;
  }

  const total = db.prepare("SELECT COUNT(*) AS total FROM reminders").get().total;

  if (total > 0) {
    // This database already has reminders; the file belongs to an older setup.
    return;
  }

  const { ok, data } = readJson(legacy);

  if (!ok) {
    return;
  }

  if (!Array.isArray(data)) {
    warn(`${legacy} does not hold a list of reminders; leaving it in place`);
    return;
  }

  const rows = data
    .filter((reminder) => reminder && typeof reminder.text === "string" && reminder.text.trim())
    .map((reminder) => [
      typeof reminder.id === "string" && reminder.id ? reminder.id : randomUUID(),
      reminder.text,
      isoOrNow(reminder.createdAt, "reminder.createdAt"),
      reminder.completed ? 1 : 0,
      isoOrNull(reminder.completedAt, "reminder.completedAt"),
      isoOrNull(reminder.dueAt, "reminder.dueAt"),
      isoOrNull(reminder.notifiedAt, "reminder.notifiedAt"),
    ]);

  if (rows.length === 0) {
    warn(`${legacy} held no usable reminders; leaving it in place`);
    return;
  }

  insertMany(
    db.prepare(`
      INSERT OR IGNORE INTO reminders
        (id, text, created_at, completed, completed_at, due_at, notified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    rows
  );

  archive(legacy);
};

const migrateTurns = () => {
  const legacyFiles = [
    path.join(dataDir, "chat-memory.json"),
    path.join(storageDir, "chat-memory.json"),
  ].filter((file) => fs.existsSync(file));

  if (legacyFiles.length === 0) {
    return;
  }

  const total = db.prepare("SELECT COUNT(*) AS total FROM chat_turns").get().total;

  if (total > 0) {
    return;
  }

  const statement = db.prepare(
    "INSERT OR IGNORE INTO chat_turns (id, role, content, created_at) VALUES (?, ?, ?, ?)"
  );

  legacyFiles.forEach((file) => {
    const { ok, data } = readJson(file);

    if (!ok) {
      return;
    }

    const turns = Array.isArray(data) ? data : data?.turns;

    if (!Array.isArray(turns)) {
      warn(`${file} does not hold a list of turns; leaving it in place`);
      return;
    }

    insertMany(
      statement,
      turns
        .filter((turn) => turn && typeof turn.content === "string")
        .map((turn) => [
          typeof turn.id === "string" && turn.id ? turn.id : randomUUID(),
          turn.role === "assistant" ? "assistant" : "user",
          turn.content.slice(0, 4000),
          isoOrNow(turn.at, "turn.at"),
        ])
    );

    archive(file);
  });

  db.prepare(`
    DELETE FROM chat_turns
    WHERE rowid NOT IN (SELECT rowid FROM chat_turns ORDER BY rowid DESC LIMIT ?)
  `).run(MAX_TURNS);
};

migrateReminders();
migrateTurns();

// Windows keeps the database file locked until the connection closes, which
// matters for tests that delete their temporary data directory.
export const closeDatabase = () => {
  try {
    db.close();
  } catch {
    // already closed
  }
};
