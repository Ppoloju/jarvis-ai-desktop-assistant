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
// The suite must not depend on whatever model happens to run on this machine.
process.env.ORBIT_DISABLE_OLLAMA = "1";

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

  assert.ok(body.disk === null || body.disk.totalBytes > 0, "disk space is reported when available");
});

test("reports device health and safe steps", async () => {
  const diagnostics = await import("../services/system/diagnostics.service.js");
  const device = (overrides = {}) => ({
    platform: "win32",
    release: "10.0.22631",
    arch: "x64",
    cpuCount: 8,
    totalMemoryBytes: 16 * 1024 ** 3,
    freeMemoryBytes: 8 * 1024 ** 3,
    disk: { freeBytes: 200 * 1024 ** 3, totalBytes: 500 * 1024 ** 3 },
    uptimeSeconds: 3_600,
    battery: { available: true, percentage: 80, pluggedIn: true },
    ...overrides,
  });

  assert.deepEqual(diagnostics.assess(device()), [], "a healthy machine has nothing to flag");

  const struggling = device({
    freeMemoryBytes: 0.4 * 1024 ** 3,
    disk: { freeBytes: 2 * 1024 ** 3, totalBytes: 500 * 1024 ** 3 },
    uptimeSeconds: 30 * 86_400,
    battery: { available: true, percentage: 10, pluggedIn: false },
  });
  const titles = diagnostics.assess(struggling).map((issue) => issue.title);

  assert.ok(titles.some((title) => /memory/i.test(title)));
  assert.ok(titles.some((title) => /disk/i.test(title)));
  assert.ok(titles.some((title) => /running for a while/i.test(title)));
  assert.ok(titles.some((title) => /battery/i.test(title)));

  const report = diagnostics.formatReport({ info: struggling, issues: diagnostics.assess(struggling) });

  assert.match(report, /Here is what I can see/);
  assert.match(report, /Memory is nearly full/);
  assert.match(report, /cannot change settings/i);

  const context = diagnostics.modelContext(struggling);

  assert.match(context, /Device snapshot/);
  assert.match(context, /Battery: 10%/);

  const chat = await (await postJson("/api/chat", { message: "why is my computer slow" })).json();

  assert.match(chat.reply, /Here is what I can see on this computer/);
  assert.match(chat.reply, /CPU cores/);
  assert.match(chat.reply, /cannot change settings/i);
});

test("reports running processes and resource usage", async () => {
  const processes = await import("../services/system/processes.service.js");

  const windows = processes.parseWindows(
    JSON.stringify([
      { Name: "chrome", WorkingSet64: 2 * 1024 ** 3 },
      { Name: "chrome", WorkingSet64: 1024 ** 3 },
      { Name: "Code", WorkingSet64: 512 * 1024 ** 2 },
    ])
  );

  assert.equal(windows[0].name, "chrome");
  assert.equal(windows[0].count, 2);
  assert.equal(windows[0].memoryBytes, 3 * 1024 ** 3);

  const unix = processes.parsePs(
    " 12 1.5 204800 /usr/bin/code helper\n 13 0.5 102400 /usr/bin/code helper\n"
  );

  assert.equal(unix[0].name, "/usr/bin/code helper");
  assert.equal(unix[0].count, 2);
  assert.equal(unix[0].memoryBytes, 300 * 1024 * 1024);
  assert.equal(unix[0].cpuPercent, 2);

  const report = processes.formatReport({
    info: {
      cpuCount: 8,
      totalMemoryBytes: 16 * 1024 ** 3,
      freeMemoryBytes: 8 * 1024 ** 3,
    },
    usage: 25,
    list: {
      total: 214,
      items: [{ name: "chrome", count: 2, memoryBytes: 3 * 1024 ** 3, cpuPercent: null }],
    },
  });

  assert.match(report, /CPU usage: 25% across 8 cores/);
  assert.match(report, /50% in use/);
  assert.match(report, /chrome \(2 processes\): 3\.0 GB/);
  assert.match(report, /do not stop/i);

  assert.match(
    processes.formatForModel({ total: 214, items: [{ name: "chrome", memoryBytes: 1024 ** 3 }] }),
    /top 1 of 214/
  );

  const chat = await (await postJson("/api/chat", { message: "what processes are running" })).json();

  assert.match(chat.reply, /CPU usage:/);
  assert.match(chat.reply, /Processes: \d+ running/);
  assert.match(chat.reply, /Top \d+ by memory/);

  const memory = await (await postJson("/api/chat", { message: "what is using my memory" })).json();

  assert.match(memory.reply, /Memory:/);
  assert.match(memory.reply, /do not stop/i);
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
  fs.writeFileSync(path.join(storageDir, "reminders.json.migrated-1700000000000"), "{}");

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

test("parses daily and weekly reminders", async () => {
  const { parseDueDate, parseSnoozeMinutes } = await import("../services/reminders/due.js");
  const now = new Date("2026-03-04T10:00:00");

  const daily = parseDueDate("take pills every day at 9am", now);

  assert.equal(daily.text, "take pills");
  assert.equal(daily.repeat, "daily");
  assert.equal(new Date(daily.dueAt).getDate(), 5);
  assert.equal(new Date(daily.dueAt).getHours(), 9);

  const evening = parseDueDate("walk the dog daily at 6pm", now);

  assert.equal(evening.text, "walk the dog");
  assert.equal(new Date(evening.dueAt).getDate(), 4);
  assert.equal(new Date(evening.dueAt).getHours(), 18);

  const weekly = parseDueDate("water the plants every week at 9am", now);

  assert.equal(weekly.text, "water the plants");
  assert.equal(weekly.repeat, "weekly");
  assert.equal(new Date(weekly.dueAt).getDate(), 11);
  assert.equal(new Date(weekly.dueAt).getHours(), 9);

  const weeklyEvening = parseDueDate("call home weekly at 6pm", now);

  assert.equal(new Date(weeklyEvening.dueAt).getDate(), 4);
  assert.equal(new Date(weeklyEvening.dueAt).getHours(), 18);

  assert.equal(parseDueDate("buy milk", now).repeat, null);
  assert.equal(parseSnoozeMinutes("10 minutes"), 10);
  assert.equal(parseSnoozeMinutes("an hour"), 60);
  assert.equal(parseSnoozeMinutes("half an hour"), 30);
  assert.equal(parseSnoozeMinutes("2 days"), 2 * 24 * 60);
  assert.equal(parseSnoozeMinutes("sometime"), null);
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

test("advances a recurring reminder after it fires", async () => {
  const reminders = await import("../services/reminders/reminders.service.js");
  const { fireDueReminders } = await import("../services/reminders/scheduler.js");

  const created = reminders.addReminder("take the pills every day in 1 minute");

  assert.equal(created.text, "take the pills");
  assert.equal(created.repeat, "daily");
  assert.ok(created.dueAt);

  const later = new Date(Date.now() + 2 * 60_000);
  const fired = fireDueReminders(later).filter((reminder) => reminder.id === created.id);

  assert.equal(fired.length, 1);

  const stored = reminders.getReminders().find((reminder) => reminder.id === created.id);
  const gap = new Date(stored.dueAt).getTime() - new Date(created.dueAt).getTime();

  assert.ok(gap >= 23 * 60 * 60_000 && gap <= 25 * 60 * 60_000, "moves to the next day");
  assert.ok(new Date(stored.dueAt) > later);
  assert.equal(stored.notifiedAt, null, "the next occurrence is not marked as sent");
  assert.equal(stored.repeat, "daily");

  assert.equal(fireDueReminders(later).filter((reminder) => reminder.id === created.id).length, 0);

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

test("snoozes a reminder over the API", async () => {
  const { reminder } = await (
    await postJson("/api/reminders", { text: "call the plumber" })
  ).json();

  const snoozed = await postJson(`/api/reminders/${reminder.id}/snooze`, { minutes: 10 });

  assert.equal(snoozed.status, 200);

  const body = await snoozed.json();
  const gap = new Date(body.reminder.dueAt).getTime() - Date.now();

  assert.ok(gap > 9 * 60_000 && gap < 11 * 60_000);
  assert.equal(body.reminder.notifiedAt, null);
  assert.equal(body.reminder.completed, false);

  assert.equal((await postJson(`/api/reminders/${reminder.id}/snooze`, { minutes: 0 })).status, 400);
  assert.equal((await postJson("/api/reminders/missing/snooze", { minutes: 5 })).status, 404);

  await call(`/api/reminders/${reminder.id}`, { method: "DELETE" });
});

test("assistant adds recurring reminders and snoozes them", async () => {
  const reminders = await import("../services/reminders/reminders.service.js");

  const added = await (
    await postJson("/api/chat", { message: "remind me to take the bins out every week at 7pm" })
  ).json();

  assert.match(added.reply, /Added reminder: take the bins out/);
  assert.match(added.reply, /every week/i);

  const bins = reminders
    .getReminders()
    .findLast((reminder) => reminder.text === "take the bins out");

  assert.ok(bins, "the recurring reminder is saved");
  assert.equal(bins.repeat, "weekly");
  assert.ok(bins.dueAt);

  const snoozed = await (
    await postJson("/api/chat", { message: "snooze the bins reminder for 10 minutes" })
  ).json();

  assert.match(snoozed.reply, /Snoozed "take the bins out"/i);
  assert.match(snoozed.reply, /repeats weekly/i);

  const after = reminders.getReminders().find((reminder) => reminder.id === bins.id);
  const gap = new Date(after.dueAt).getTime() - Date.now();

  assert.ok(gap > 9 * 60_000 && gap < 11 * 60_000, "the due time moves forward");

  const missing = await (
    await postJson("/api/chat", { message: "snooze the zzzz reminder for 10 minutes" })
  ).json();

  assert.match(missing.reply, /could not find/i);

  const noDuration = await (
    await postJson("/api/chat", { message: "snooze reminder 1 for a while" })
  ).json();

  assert.match(noDuration.reply, /how long to snooze/i);

  reminders.deleteReminder(bins.id);
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

    requests.length = 0;
    await answer("why is my laptop slow", { context: "Device snapshot: 1.0 GB free of 8.0 GB" });

    assert.equal(requests[0].body.messages[1].role, "system");
    assert.match(requests[0].body.messages[1].content, /Device snapshot/);
    assert.equal(requests[0].body.messages.at(-1).content, "why is my laptop slow");

    global.fetch = async () => new Response("nope", { status: 500 });

    await assert.rejects(() => answer("another question"), /service returned 500/);
  } finally {
    global.fetch = originalFetch;
    delete process.env.AI_API_KEY;
  }
});

test("uses a local Ollama model when no AI key is configured", async () => {
  const ai = await import("../services/ai/ai.service.js");
  const originalFetch = global.fetch;
  const calls = [];

  process.env.ORBIT_DISABLE_OLLAMA = "0";
  ai.clearLocalCache();

  try {
    global.fetch = async (url, options = {}) => {
      calls.push({
        url: String(url),
        headers: options.headers || {},
        body: options.body ? JSON.parse(options.body) : null,
      });

      if (String(url).endsWith("/api/tags")) {
        return new Response(JSON.stringify({ models: [{ name: "llama3.2:latest" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ choices: [{ message: { content: "Local hello." } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const status = await ai.status({ refresh: true });

    assert.equal(status.configured, true);
    assert.equal(status.provider, "local");
    assert.equal(status.model, "llama3.2:latest");
    assert.equal(await ai.isConfigured(), true);
    assert.equal(await ai.answer("say hello"), "Local hello.");

    const chat = calls.find((entry) => entry.url.endsWith("/v1/chat/completions"));

    assert.ok(chat, "chat goes to Ollama's OpenAI-compatible endpoint");
    assert.equal(chat.url, "http://127.0.0.1:11434/v1/chat/completions");
    assert.equal(chat.headers.Authorization, undefined);
    assert.equal(chat.body.model, "llama3.2:latest");
  } finally {
    global.fetch = originalFetch;
    process.env.ORBIT_DISABLE_OLLAMA = "1";
    ai.clearLocalCache();
  }
});

test("backs up the database without stopping the API", async () => {
  const { db } = await import("../services/db/db.service.js");

  const created = await call("/api/system/backup", { method: "POST" });
  const body = await created.json();

  assert.equal(created.status, 200);
  assert.match(body.backup.file, /^orbit-backup-.*\.db$/);
  assert.ok(body.backup.size > 0);

  const file = path.join(process.env.ORBIT_DATA_DIR, "backups", body.backup.file);

  assert.ok(fs.existsSync(file), "the snapshot exists on disk");

  const listed = await (await call("/api/system/backup")).json();

  assert.ok(listed.backups.some((entry) => entry.file === body.backup.file));

  const { DatabaseSync } = await import("node:sqlite");
  const copy = new DatabaseSync(file);

  try {
    const snapshot = copy.prepare("SELECT COUNT(*) AS total FROM reminders").get().total;
    const live = db.prepare("SELECT COUNT(*) AS total FROM reminders").get().total;

    assert.equal(snapshot, live, "the snapshot is a readable, current database");
  } finally {
    copy.close();
  }
});

test("reports the AI setup over the API", async () => {
  const response = await call("/api/system/ai");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(typeof body.configured, "boolean");
  assert.ok("provider" in body);

  const health = await (await call("/api/health")).json();

  assert.equal(health.ai.configured, body.configured);
});

test("remembers the local model chosen in Settings", async () => {
  const ai = await import("../services/ai/ai.service.js");
  const originalFetch = global.fetch;

  process.env.ORBIT_DISABLE_OLLAMA = "0";
  ai.clearLocalCache();

  try {
    global.fetch = async (url) => {
      if (String(url).endsWith("/api/tags")) {
        return new Response(
          JSON.stringify({ models: [{ name: "llama3.2:latest" }, { name: "qwen2.5-coder:7b" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    // global.fetch is mocked above, so the HTTP calls use the real one.
    const request = (route, options) => originalFetch(base + route, options);
    const put = (model) =>
      request("/api/system/ai/model", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });

    const saved = await put("qwen2.5-coder:7b");

    assert.equal(saved.status, 200);

    const chosen = await saved.json();

    assert.equal(chosen.model, "qwen2.5-coder:7b");
    assert.equal(chosen.preferred, "qwen2.5-coder:7b");
    assert.equal((await (await request("/api/system/ai")).json()).model, "qwen2.5-coder:7b");

    assert.equal((await put("not-installed")).status, 400);
    assert.equal((await put("")).status, 200);
  } finally {
    global.fetch = originalFetch;
    process.env.ORBIT_DISABLE_OLLAMA = "1";
    ai.clearLocalCache();
  }
});

test("keeps the model picker when the saved model is uninstalled", async () => {
  const ai = await import("../services/ai/ai.service.js");
  const originalFetch = global.fetch;
  const installed = { models: [{ name: "llama3.2:latest" }, { name: "qwen2.5-coder:7b" }] };

  process.env.ORBIT_DISABLE_OLLAMA = "0";
  ai.clearLocalCache();

  try {
    global.fetch = async (url) => {
      if (String(url).endsWith("/api/tags")) {
        return new Response(JSON.stringify(installed), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    // global.fetch is mocked above, so the HTTP calls use the real one.
    const request = (route, options) => originalFetch(base + route, options);
    const put = (model) =>
      request("/api/system/ai/model", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });

    assert.equal((await put("qwen2.5-coder:7b")).status, 200);

    // The saved model is removed from Ollama afterwards.
    installed.models = [{ name: "llama3.2:latest" }];
    ai.clearLocalCache();

    const response = await request("/api/system/ai?refresh=1");
    const status = await response.json();

    assert.equal(response.status, 200);
    assert.equal(status.configured, false);
    assert.deepEqual(
      status.models,
      ["llama3.2:latest"],
      "installed models are still reported so Settings keeps the picker"
    );
    assert.equal(status.preferred, "qwen2.5-coder:7b", "the missing choice is still shown");

    const reset = await put("");

    assert.equal(reset.status, 200);
    assert.equal((await reset.json()).model, "llama3.2:latest", "Automatic picks an installed model");
  } finally {
    global.fetch = originalFetch;
    process.env.ORBIT_DISABLE_OLLAMA = "1";
    ai.clearLocalCache();
    await ai.setLocalModel("").catch(() => {});
  }
});
