import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import http from "node:http";
import path from "node:path";

process.env.ORBIT_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-test-"));
process.env.ORBIT_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-home-"));
process.env.ORBIT_APPS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-apps-"));
process.env.ORBIT_NO_NOTIFY = "1";

const homeDir = process.env.ORBIT_HOME;
const appsDir = process.env.ORBIT_APPS_DIR;

const { default: app } = await import("../app.js");
const { closeDatabase } = await import("../services/db/db.service.js");

let server;
let base;

const call = (route, options) => fetch(`${base}${route}`, options);

const rawRequest = (route, headers = {}) =>
  new Promise((resolve, reject) => {
    const request = http.request(
      { hostname: "127.0.0.1", port: server.address().port, path: route, headers },
      (response) => {
        response.resume();
        response.on("end", () => resolve({ status: response.statusCode, headers: response.headers }));
      }
    );

    request.on("error", reject);
    request.end();
  });

const postJson = (route, body) =>
  call(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test.before(async () => {
  fs.mkdirSync(path.join(homeDir, "Desktop", "Projects"), { recursive: true });
  fs.writeFileSync(path.join(homeDir, "Desktop", "welcome.txt"), "hi");
  fs.mkdirSync(path.join(homeDir, "Documents"), { recursive: true });
  fs.writeFileSync(path.join(homeDir, "Documents", "notes.txt"), "notes");
  fs.mkdirSync(path.join(homeDir, "Downloads"), { recursive: true });
  fs.writeFileSync(path.join(homeDir, "Downloads", "report.pdf"), "pdf");

  // Stand-ins for Start Menu shortcuts, so discovery is testable on any OS
  fs.mkdirSync(path.join(appsDir, "Tools"), { recursive: true });
  fs.writeFileSync(path.join(appsDir, "Fake Editor.lnk"), "");
  fs.writeFileSync(path.join(appsDir, "Video Player.lnk"), "");
  fs.writeFileSync(path.join(appsDir, "Tools", "Calc Plus.lnk"), "");
  fs.writeFileSync(path.join(appsDir, "Uninstall Fake Editor.lnk"), "");

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
  closeDatabase();
  fs.rmSync(process.env.ORBIT_DATA_DIR, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
  fs.rmSync(appsDir, { recursive: true, force: true });
});

test("serves the health message", async () => {
  const response = await call("/");
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(body, "Orbit API is running.");
});

test("serves screenshots from the configured data directory", async () => {
  const screenshotsDir = path.join(process.env.ORBIT_DATA_DIR, "screenshots");
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.writeFileSync(path.join(screenshotsDir, "test.png"), "test-image");

  const response = await call("/screenshots/test.png");

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "test-image");
});

test("returns system info", async () => {
  const response = await call("/api/system/info");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.platform);
  assert.ok(body.cpuCount > 0);
  assert.equal(typeof body.battery.available, "boolean");

  if (body.battery.available) {
    assert.ok(body.battery.percentage >= 0 && body.battery.percentage <= 100);
  }
});

test("answers chat messages and rejects empty ones", async () => {
  const ok = await postJson("/api/chat", { message: "what is the time" });
  const okBody = await ok.json();

  assert.equal(ok.status, 200);
  assert.match(okBody.reply, /time is/i);

  const bad = await postJson("/api/chat", {});

  assert.equal(bad.status, 400);
});

test("validates automation input", async () => {
  assert.equal((await postJson("/api/automation/open-website", {})).status, 400);
  assert.equal(
    (await postJson("/api/automation/open-website", { url: "file:///etc/passwd" })).status,
    400
  );
  assert.equal((await postJson("/api/automation/open-app", { app: "zzz-not-installed" })).status, 400);
});

test("discovers installed app shortcuts", async () => {
  const response = await call("/api/automation/apps");
  const body = await response.json();
  const labels = body.apps.map((app) => app.label);

  assert.equal(response.status, 200);
  assert.ok(labels.includes("Fake Editor"));
  assert.ok(labels.includes("Video Player"));
  assert.ok(labels.includes("Calc Plus"), "finds shortcuts in subfolders");
  assert.ok(!labels.some((label) => /uninstall/i.test(label)), "skips uninstallers");
  assert.ok(body.apps.every((app) => !app.path), "paths stay on the server");
});

test("resolves installed apps by spoken name", async () => {
  const { resolveApp } = await import("../services/automation/apps.service.js");

  assert.equal(resolveApp("Fake Editor")?.label, "Fake Editor");
  assert.equal(resolveApp("fake editor")?.label, "Fake Editor");
  assert.equal(resolveApp("video")?.label, "Video Player");
  assert.equal(resolveApp("calc")?.label, "Calc Plus");
  assert.equal(resolveApp("zzz-not-installed"), null);
});

test("assistant offers to launch installed apps", async () => {
  const unknown = await (
    await postJson("/api/chat", { message: "open zzz-not-installed" })
  ).json();

  assert.match(unknown.reply, /installed on this computer/i);
});

test("creates, lists and deletes files", async () => {
  const created = await postJson("/api/files/create-file", {
    fileName: "notes/hello.txt",
    content: "hi",
  });

  assert.equal(created.status, 201);

  const duplicate = await postJson("/api/files/create-file", {
    fileName: "notes/hello.txt",
  });

  assert.equal(duplicate.status, 409);

  const listed = await (await call("/api/files")).json();

  assert.ok(listed.entries.some((entry) => entry.name === "notes"));

  const escape = await postJson("/api/files/create-file", {
    fileName: "../escaped.txt",
  });

  assert.equal(escape.status, 400);

  const deleted = await call("/api/files/delete-file", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: "notes" }),
  });

  assert.equal(deleted.status, 200);

  const missing = await call("/api/files/delete-file", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: "notes" }),
  });

  assert.equal(missing.status, 404);
});

test("creates and deletes reminders", async () => {
  assert.equal((await postJson("/api/reminders", {})).status, 400);

  const created = await postJson("/api/reminders", { text: "buy milk" });
  const { reminder } = await created.json();

  assert.equal(created.status, 201);
  assert.ok(reminder.id);

  const listed = await (await call("/api/reminders")).json();

  assert.equal(listed.reminders.length, 1);

  assert.equal((await call(`/api/reminders/${reminder.id}`, { method: "DELETE" })).status, 200);
  assert.equal((await call(`/api/reminders/${reminder.id}`, { method: "DELETE" })).status, 404);
});

test("returns 404 for unknown routes", async () => {
  assert.equal((await call("/api/nope")).status, 404);
});

test("reports health with security headers", async () => {
  const response = await call("/api/health");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.storageWritable, true);
  assert.ok(body.uptimeSeconds >= 0);

  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-powered-by"), null);
});

test("rejects requests addressed to a foreign hostname", async () => {
  const rebound = await rawRequest("/api/health", { Host: "rebind.evil.example" });

  assert.equal(rebound.status, 403);

  const local = await rawRequest("/api/health", { Host: "localhost" });

  assert.equal(local.status, 200);
});

test("allows screenshots to load from another origin", async () => {
  const screenshot = await rawRequest("/screenshots/test.png");
  const api = await rawRequest("/api/health");

  assert.equal(screenshot.headers["cross-origin-resource-policy"], "cross-origin");
  assert.equal(api.headers["cross-origin-resource-policy"], "same-origin");
});

test("keeps the database and old data files out of the files page", async () => {
  const storageDir = path.join(process.env.ORBIT_DATA_DIR, "storage");
  fs.mkdirSync(storageDir, { recursive: true });
  fs.writeFileSync(path.join(storageDir, "reminders.json.tmp"), "{}");
  fs.writeFileSync(path.join(storageDir, "chat-memory.json.migrated"), "{}");

  const { entries } = await (await call("/api/files")).json();
  const names = entries.map((entry) => entry.name);

  assert.ok(!names.includes("orbit.db"), "the SQLite database is hidden");
  assert.ok(!names.some((name) => name.startsWith("orbit.db-")));
  assert.ok(!names.some((name) => name.startsWith("reminders.json.")));
  assert.ok(!names.some((name) => name.startsWith("chat-memory.json.")));
});

test("rejects oversized chat messages and reminders", async () => {
  assert.equal((await postJson("/api/chat", { message: "x".repeat(2001) })).status, 413);
  assert.equal((await postJson("/api/reminders", { text: "x".repeat(501) })).status, 400);
});

test("blocks foreign origins", async () => {
  const response = await call("/api/system/info", {
    headers: { Origin: "https://evil.example" },
  });

  assert.equal(response.status, 403);

  const allowed = await call("/api/system/info", {
    headers: { Origin: "http://localhost:5173" },
  });

  assert.equal(allowed.status, 200);
});

test("assistant handles small talk and lists capabilities", async () => {
  const smallTalk = await (await postJson("/api/chat", { message: "how are you" })).json();

  assert.match(smallTalk.reply, /smoothly/i);

  const thanks = await (await postJson("/api/chat", { message: "thanks" })).json();

  assert.match(thanks.reply, /anytime/i);

  const help = await (await postJson("/api/chat", { message: "what can you do" })).json();

  assert.match(help.reply, /Reminders/i);
});

test("assistant creates and reads reminders", async () => {
  const created = await (
    await postJson("/api/chat", { message: "remind me to water plants" })
  ).json();

  assert.match(created.reply, /water plants/);

  const listed = await (await postJson("/api/chat", { message: "list my reminders" })).json();

  assert.match(listed.reply, /water plants/);
});

test("assistant reports system status and handles unknown input", async () => {
  const status = await (await postJson("/api/chat", { message: "system info" })).json();

  assert.match(status.reply, /CPU cores/i);

  const unknown = await (
    await postJson("/api/chat", { message: "tell me a joke about penguins" })
  ).json();

  assert.match(unknown.reply, /do not have a matching command/i);
  assert.match(unknown.reply, /what time is it/i);
});

test("previews stored text files and refuses folders and binary files", async () => {
  await postJson("/api/files/create-file", { fileName: "preview/hello.txt", content: "hello orbit" });
  fs.writeFileSync(path.join(process.env.ORBIT_DATA_DIR, "storage", "preview", "binary.bin"), Buffer.from([0, 1, 2, 3]));

  const text = await call("/api/files/content?name=preview%2Fhello.txt");
  const body = await text.json();

  assert.equal(text.status, 200);
  assert.equal(body.file.content, "hello orbit");

  assert.equal((await call("/api/files/content?name=preview")).status, 400);
  assert.equal((await call("/api/files/content?name=preview%2Fbinary.bin")).status, 415);
  assert.equal((await call("/api/files/content?name=missing.txt")).status, 404);
  assert.equal((await call("/api/files/content?name=..%2Fescape.txt")).status, 400);
});

test("marks reminders as done and back to open", async () => {
  const created = await postJson("/api/reminders", { text: "stretch" });
  const { reminder } = await created.json();

  const done = await call(`/api/reminders/${reminder.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: true }),
  });
  const doneBody = await done.json();

  assert.equal(done.status, 200);
  assert.equal(doneBody.reminder.completed, true);
  assert.ok(doneBody.reminder.completedAt);

  const bad = await call(`/api/reminders/${reminder.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: "yes" }),
  });

  assert.equal(bad.status, 400);
  assert.equal((await call("/api/reminders/missing", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: true }),
  })).status, 404);

  const reopened = await call(`/api/reminders/${reminder.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: false }),
  });
  const reopenedBody = await reopened.json();

  assert.equal(reopenedBody.reminder.completed, false);
  assert.equal(reopenedBody.reminder.completedAt, null);
});

test("lists recent screenshots newest first", async () => {
  const screenshotsDir = path.join(process.env.ORBIT_DATA_DIR, "screenshots");
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.writeFileSync(path.join(screenshotsDir, "older.png"), "one");
  fs.writeFileSync(path.join(screenshotsDir, "newer.png"), "two");
  fs.utimesSync(path.join(screenshotsDir, "older.png"), new Date(2020, 0, 1), new Date(2020, 0, 1));

  const { screenshots } = await (await call("/api/automation/screenshots")).json();

  assert.equal(screenshots[0].file, "newer.png");
  assert.ok(screenshots.some((item) => item.file === "test.png"));
  assert.match(screenshots[0].url, /^\/screenshots\//);
});

test("assistant reads stored files and adds timed reminders", async () => {
  await postJson("/api/files/create-file", { fileName: "chat-note.txt", content: "remember this" });

  const read = await (await postJson("/api/chat", { message: "read chat-note.txt" })).json();

  assert.match(read.reply, /remember this/);

  const timed = await (await postJson("/api/chat", { message: "remind me to time my run" })).json();

  assert.match(timed.reply, /Added reminder: time my run/i);
});

test("serves an API index", async () => {
  const response = await call("/api");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.service, "orbit-api");
  assert.ok(body.endpoints.system);
  assert.ok(body.endpoints.files.includes("GET /api/files/content?name=..."));
});

test("rejects non-text file content", async () => {
  const response = await postJson("/api/files/create-file", {
    fileName: "bad.txt",
    content: 42,
  });

  assert.equal(response.status, 400);
});

test("refuses to delete the storage folder itself", async () => {
  const response = await call("/api/files/delete-file", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: "." }),
  });

  assert.equal(response.status, 400);
});

test("lists folders before files in alphabetical order", async () => {
  await postJson("/api/files/create-file", { fileName: "zebra.txt" });
  await postJson("/api/files/create-file", { fileName: "alpha.txt" });
  await postJson("/api/files/create-folder", { folderName: "workspace" });

  const { entries } = await (await call("/api/files")).json();
  const names = entries.map((entry) => entry.name);

  // Only compare this test's own entries so earlier tests cannot reorder the result
  assert.deepEqual(
    names.filter((name) => ["workspace", "alpha.txt", "zebra.txt"].includes(name)),
    ["workspace", "alpha.txt", "zebra.txt"]
  );
});

test("lists the laptop folders and their contents", async () => {
  const { folders } = await (await call("/api/laptop")).json();
  const downloads = folders.find((folder) => folder.key === "downloads");

  assert.equal(downloads.exists, true);
  assert.equal(downloads.count, 1);

  const listing = await (await call("/api/laptop/downloads")).json();

  assert.equal(listing.readOnly, true);
  assert.equal(listing.entries[0].name, "report.pdf");
  assert.equal(listing.entries[0].type, "file");

  const nested = await (await call("/api/laptop/desktop?path=Projects")).json();

  assert.deepEqual(nested.segments, ["Projects"]);
  assert.deepEqual(nested.entries, []);
});

test("keeps the laptop browser read-only", async () => {
  assert.equal((await call("/api/laptop/downloads?path=..%2F..")).status, 400);
  assert.equal((await call("/api/laptop/downloads?path=%2Fetc")).status, 400);
  assert.equal((await call("/api/laptop/music")).status, 404);
  assert.equal((await call("/api/laptop/downloads", { method: "POST" })).status, 404);
  assert.equal((await call("/api/laptop/downloads", { method: "DELETE" })).status, 404);
});

test("assistant answers questions about laptop folders", async () => {
  const downloads = await (
    await postJson("/api/chat", { message: "what's in my downloads" })
  ).json();

  assert.match(downloads.reply, /report\.pdf/);
  assert.match(downloads.reply, /read-only/i);

  const desktop = await (await postJson("/api/chat", { message: "show me my desktop" })).json();

  assert.match(desktop.reply, /Projects/);
});

test("searches the laptop folders by file name", async () => {
  const found = await (await call("/api/laptop/search?q=report")).json();

  assert.equal(found.matches[0].name, "report.pdf");

  const nested = await (await call("/api/laptop/search?q=notes")).json();

  assert.ok(nested.matches.some((match) => match.name === "notes.txt"));
  assert.equal((await call("/api/laptop/search?q=a")).status, 400);
});

test("assistant finds files and offers to open them", async () => {
  const found = await (await postJson("/api/chat", { message: "find report.pdf" })).json();

  assert.match(found.reply, /report\.pdf/);
  assert.match(found.reply, /open the first one/i);

  const missing = await (
    await postJson("/api/chat", { message: "find zzzz-nope" })
  ).json();

  assert.match(missing.reply, /could not find/i);
});

test("parses reminder times from text", async () => {
  const { parseDueDate } = await import("../services/reminders/due.js");
  const now = new Date("2026-03-04T10:00:00");

  const minutes = parseDueDate("call Sam in 20 minutes", now);

  assert.equal(minutes.text, "call Sam");
  assert.equal(new Date(minutes.dueAt).getTime() - now.getTime(), 20 * 60_000);

  const morning = parseDueDate("send the report tomorrow at 9am", now);

  assert.equal(morning.text, "send the report");
  assert.equal(new Date(morning.dueAt).getDate(), 5);
  assert.equal(new Date(morning.dueAt).getHours(), 9);

  const evening = parseDueDate("call the bank at 5pm", now);

  assert.equal(new Date(evening.dueAt).getDate(), 4);
  assert.equal(new Date(evening.dueAt).getHours(), 17);

  // 9am has already passed, so this means tomorrow
  const late = parseDueDate("take the bins out at 9am", now);

  assert.equal(new Date(late.dueAt).getDate(), 5);
  assert.equal(parseDueDate("buy milk", now).dueAt, null);
});

test("fires due reminders exactly once", async () => {
  const reminders = await import("../services/reminders/reminders.service.js");
  const { fireDueReminders } = await import("../services/reminders/scheduler.js");

  const created = reminders.addReminder("water the plants in 1 minute");

  assert.equal(created.text, "water the plants");
  assert.ok(created.dueAt);

  const later = new Date(Date.now() + 2 * 60_000);
  const fired = fireDueReminders(later).filter((reminder) => reminder.id === created.id);

  assert.equal(fired.length, 1);
  assert.ok(fired[0].notifiedAt);

  const repeated = fireDueReminders(later).filter((reminder) => reminder.id === created.id);

  assert.equal(repeated.length, 0);

  reminders.deleteReminder(created.id);
});

test("assistant sets timed reminders from speech", async () => {
  const added = await (
    await postJson("/api/chat", { message: "remind me to stretch in 20 minutes" })
  ).json();

  assert.match(added.reply, /Added reminder: stretch/);
  assert.match(added.reply, /desktop notification/i);

  const { reminders } = await (await call("/api/reminders")).json();
  // An earlier test saved a plain "stretch" reminder, so read the newest one
  const stretch = reminders.findLast((reminder) => reminder.text === "stretch");

  assert.ok(stretch.dueAt, "the due time is saved with the reminder");

  const listed = await (await postJson("/api/chat", { message: "list my reminders" })).json();

  assert.match(listed.reply, /stretch/);
  assert.match(listed.reply, /due/i);
});

test("explains the AI setup when a message has no matching command", async () => {
  const data = await (await postJson("/api/chat", { message: "tell me a joke about penguins" })).json();

  assert.equal(data.source, "commands");
  assert.match(data.reply, /add an AI key/i);
});

test("remembers the conversation in SQLite and forgets it on request", async () => {
  const { db, dbFile } = await import("../services/db/db.service.js");

  await postJson("/api/chat", { message: "what time is it" });

  const saved = db.prepare("SELECT role, content FROM chat_turns ORDER BY rowid").all();

  assert.ok(saved.some((turn) => turn.role === "user" && turn.content === "what time is it"));
  assert.ok(saved.some((turn) => turn.role === "assistant" && turn.content.length > 0));

  assert.equal(path.basename(dbFile), "orbit.db");
  assert.ok(fs.existsSync(dbFile), "the SQLite database file exists");

  const { entries } = await (await call("/api/files")).json();

  assert.ok(!entries.some((entry) => entry.name.startsWith("orbit.db")));

  const cleared = await (await call("/api/chat/memory", { method: "DELETE" })).json();

  assert.equal(cleared.cleared, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM chat_turns").get().total, 0);
});

test("sends free-form questions to the configured model with history", async () => {
  const { answer } = await import("../services/ai/ai.service.js");
  const originalFetch = global.fetch;
  const requests = [];

  process.env.AI_API_KEY = "test-key";

  try {
    global.fetch = async (url, options) => {
      requests.push({ url, headers: options.headers, body: JSON.parse(options.body) });

      return new Response(
        JSON.stringify({ choices: [{ message: { content: "Penguins are flightless birds." } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const reply = await answer("tell me about penguins");

    assert.equal(reply, "Penguins are flightless birds.");
    assert.equal(requests[0].url, "https://api.z.ai/api/paas/v4/chat/completions");
    assert.equal(requests[0].headers.Authorization, "Bearer test-key");
    assert.equal(requests[0].body.model, "glm-4-flash");
    assert.equal(requests[0].body.messages[0].role, "system");
    assert.equal(requests[0].body.messages.at(-1).content, "tell me about penguins");

    global.fetch = async () => new Response("nope", { status: 500 });

    await assert.rejects(() => answer("another question"), /service returned 500/);
  } finally {
    global.fetch = originalFetch;
    delete process.env.AI_API_KEY;
  }
});
