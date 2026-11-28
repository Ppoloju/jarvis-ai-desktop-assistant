import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DatabaseSync } from "node:sqlite";

const dataDir = process.env.ORBIT_DATA_DIR || path.join(import.meta.dirname, "../..");

export const storageDir = path.join(dataDir, "storage");
export const dbFile = path.join(storageDir, "orbit.db");

fs.mkdirSync(storageDir, { recursive: true });

// One synchronous connection for the whole process. Orbit is a single-user
// local app, so prepared statements are cheap and there is no pool to manage.
export const db = new DatabaseSync(dbFile);

// WAL survives an abrupt exit better than the default journal, and foreign
// keys are off by default, so enable them for whatever tables come next.
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    due_at TEXT,
    notified_at TEXT
  );

  CREATE TABLE IF NOT EXISTS chat_turns (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS reminders_due ON reminders (completed, due_at);
  CREATE INDEX IF NOT EXISTS chat_turns_recent ON chat_turns (created_at);
`);

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not read the old data file ${file}: ${error.message}`);
    }

    return null;
  }
};

// Keep the old file next to the database instead of deleting it outright.
const archive = (file) => {
  if (!fs.existsSync(file)) {
    return;
  }

  try {
    fs.renameSync(file, path.join(storageDir, `${path.basename(file)}.migrated`));
  } catch {
    // The data is already in SQLite, so a stuck archive must not stop startup.
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
const migrateLegacyJson = () => {
  const reminderCount = db.prepare("SELECT COUNT(*) AS total FROM reminders").get().total;
  const legacyReminders = path.join(storageDir, "reminders.json");

  if (reminderCount === 0 && fs.existsSync(legacyReminders)) {
    const list = readJson(legacyReminders);

    if (Array.isArray(list)) {
      const statement = db.prepare(`
        INSERT OR IGNORE INTO reminders
          (id, text, created_at, completed, completed_at, due_at, notified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insertMany(
        statement,
        list
          .filter((reminder) => reminder && typeof reminder.text === "string")
          .map((reminder) => [
            reminder.id || randomUUID(),
            reminder.text,
            reminder.createdAt || new Date().toISOString(),
            reminder.completed ? 1 : 0,
            reminder.completedAt ?? null,
            reminder.dueAt ?? null,
            reminder.notifiedAt ?? null,
          ])
      );
    }

    archive(legacyReminders);
  }

  const turnCount = db.prepare("SELECT COUNT(*) AS total FROM chat_turns").get().total;
  const legacyMemoryFiles = [
    path.join(dataDir, "chat-memory.json"),
    path.join(storageDir, "chat-memory.json"),
  ].filter((file) => fs.existsSync(file));

  if (turnCount === 0 && legacyMemoryFiles.length > 0) {
    const statement = db.prepare(
      "INSERT OR IGNORE INTO chat_turns (id, role, content, created_at) VALUES (?, ?, ?, ?)"
    );

    legacyMemoryFiles.forEach((file) => {
      const parsed = readJson(file);
      const turns = Array.isArray(parsed) ? parsed : parsed?.turns;

      if (Array.isArray(turns)) {
        insertMany(
          statement,
          turns
            .filter((turn) => turn && typeof turn.content === "string")
            .map((turn) => [
              turn.id || randomUUID(),
              turn.role === "assistant" ? "assistant" : "user",
              turn.content.slice(0, 4000),
              turn.at || new Date().toISOString(),
            ])
        );
      }

      archive(file);
    });
  }
};

migrateLegacyJson();

// Windows keeps the database file locked until the connection closes, which
// matters for tests that delete their temporary data directory.
export const closeDatabase = () => {
  try {
    db.close();
  } catch {
    // already closed
  }
};
