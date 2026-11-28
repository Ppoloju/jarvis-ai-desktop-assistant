import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const serverDir = path.join(import.meta.dirname, "..");
const dbServiceUrl = pathToFileURL(
  path.join(serverDir, "services", "db", "db.service.js")
).href;

// The import runs when db.service.js is first imported, so each case needs a
// clean process with its own data directory rather than a fresh module cache.
const runImport = (dataDir) => {
  const script = `
    const { db } = await import(${JSON.stringify(dbServiceUrl)});
    const count = (table) =>
      db.prepare(\`SELECT COUNT(*) AS total FROM \${table}\`).get().total;

    console.log(JSON.stringify({
      reminders: count("reminders"),
      turns: count("chat_turns"),
      dues: db.prepare("SELECT due_at FROM reminders ORDER BY rowid").all().map((row) => row.due_at),
      turnContents: db.prepare("SELECT content FROM chat_turns ORDER BY rowid").all().map((row) => row.content),
      turnIndexes: db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'chat_turns%'").all().length,
    }));
  `;

  const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: serverDir,
    env: { ...process.env, ORBIT_DATA_DIR: dataDir, NODE_NO_WARNINGS: "1" },
    encoding: "utf8",
  });

  return JSON.parse(output.trim().split(/\r?\n/).at(-1));
};

const makeDataDir = () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-migrate-"));
  fs.mkdirSync(path.join(dataDir, "storage"), { recursive: true });

  return dataDir;
};

const turn = (index, extra = {}) => ({
  id: `turn-${index}`,
  role: index % 2 === 0 ? "user" : "assistant",
  content: `message ${index}`,
  at: "2026-03-04T10:00:00.000Z",
  ...extra,
});

test("imports every legacy store, normalises dates, caps turns and keeps both archives", () => {
  const dataDir = makeDataDir();
  const storageDir = path.join(dataDir, "storage");
  const reminderFile = path.join(storageDir, "reminders.json");
  const rootMemoryFile = path.join(dataDir, "chat-memory.json");
  const nestedMemoryFile = path.join(storageDir, "chat-memory.json");

  const reminderJson = JSON.stringify([
    {
      id: "reminder-1",
      text: "call Sam",
      createdAt: "2026-03-04T10:00:00.000Z",
      completed: false,
      completedAt: null,
      dueAt: "2026-03-04T10:00:00+02:00",
      notifiedAt: null,
    },
    {
      id: "reminder-2",
      text: "no due date",
      createdAt: "not a date",
      completed: true,
      completedAt: "2026-03-04T11:00:00.000Z",
    },
    { text: "  " },
    null,
  ]);
  const rootMemoryJson = JSON.stringify({
    turns: Array.from({ length: 20 }, (_, index) => turn(index)),
  });
  const nestedMemoryJson = JSON.stringify(
    Array.from({ length: 15 }, (_, index) => turn(index + 20))
  );

  fs.writeFileSync(reminderFile, reminderJson);
  fs.writeFileSync(rootMemoryFile, rootMemoryJson);
  fs.writeFileSync(nestedMemoryFile, nestedMemoryJson);

  try {
    const result = runImport(dataDir);

    assert.equal(result.reminders, 2);
    assert.deepEqual(result.dues, ["2026-03-04T08:00:00.000Z", null]);
    assert.equal(result.turns, 24, "imported turns are capped at the runtime limit");
    assert.deepEqual(
      result.turnContents,
      Array.from({ length: 24 }, (_, index) => `message ${index + 11}`),
      "the newest turns survive"
    );
    assert.equal(result.turnIndexes, 0, "the unused created_at index is gone");

    assert.equal(fs.existsSync(reminderFile), false);
    assert.equal(fs.existsSync(rootMemoryFile), false);
    assert.equal(fs.existsSync(nestedMemoryFile), false);

    const archives = fs
      .readdirSync(storageDir)
      .filter((name) => name.includes(".migrated"))
      .sort();

    assert.equal(archives.length, 3, `expected one archive per legacy file: ${archives}`);

    const archivedReminder = fs.readFileSync(path.join(storageDir, "reminders.json.migrated"), "utf8");
    const archivedMemories = archives
      .filter((name) => name.startsWith("chat-memory.json.migrated"))
      .map((name) => fs.readFileSync(path.join(storageDir, name), "utf8"));

    assert.equal(archivedReminder, reminderJson);
    assert.deepEqual(
      archivedMemories.sort(),
      [rootMemoryJson, nestedMemoryJson].sort(),
      "neither archive overwrote the other"
    );
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test("leaves an unreadable legacy file in place and still starts", () => {
  const dataDir = makeDataDir();
  const storageDir = path.join(dataDir, "storage");
  const reminderFile = path.join(storageDir, "reminders.json");

  fs.writeFileSync(reminderFile, "{ this is not json");

  try {
    const result = runImport(dataDir);

    assert.equal(result.reminders, 0);
    assert.equal(result.turns, 0);
    assert.equal(fs.existsSync(reminderFile), true, "the bad file is not renamed");
    assert.ok(!fs.existsSync(path.join(storageDir, "reminders.json.migrated")));
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test("does nothing on a second start", () => {
  const dataDir = makeDataDir();
  const storageDir = path.join(dataDir, "storage");
  const reminderFile = path.join(storageDir, "reminders.json");

  fs.writeFileSync(
    reminderFile,
    JSON.stringify([{ id: "r1", text: "one reminder", createdAt: "2026-03-04T10:00:00.000Z" }])
  );

  try {
    assert.equal(runImport(dataDir).reminders, 1);

    const afterFirst = fs.readdirSync(storageDir).sort();
    const second = runImport(dataDir);

    assert.equal(second.reminders, 1, "no duplicate rows");
    assert.deepEqual(fs.readdirSync(storageDir).sort(), afterFirst, "no extra archives");
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
