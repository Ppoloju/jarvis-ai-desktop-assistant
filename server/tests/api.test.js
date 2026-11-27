import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.ORBIT_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-test-"));
process.env.ORBIT_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-home-"));

const homeDir = process.env.ORBIT_HOME;

const { default: app } = await import("../app.js");

let server;
let base;

const call = (route, options) => fetch(`${base}${route}`, options);

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

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
  fs.rmSync(process.env.ORBIT_DATA_DIR, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
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
  assert.equal((await postJson("/api/automation/open-app", { app: "spotify" })).status, 400);
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

  assert.match(unknown.reply, /not sure how to help/i);
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
