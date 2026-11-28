import { exec, execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import open from "open";

import { assert, httpError } from "../../utils/http.js";
import { resolveAllowedPath } from "../laptop/laptop.service.js";
import * as apps from "./apps.service.js";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);
const workerPath = path.join(import.meta.dirname, "../../utils/screenshot-worker.js");
const windowsScriptPath = path.join(import.meta.dirname, "../../utils/screenshot-windows.ps1");

const dataDir = process.env.ORBIT_DATA_DIR || path.join(import.meta.dirname, "../..");
const screenshotsDir = path.join(dataDir, "screenshots");
const MAX_SCREENSHOTS = 20;
const LAUNCH_TIMEOUT_MS = 10000;

const SUPPORTED_APPS = new Set(["chrome", "vscode", "calculator"]);
const APP_LABELS = { chrome: "Chrome", vscode: "VS Code", calculator: "Calculator" };
const NO_DISPLAY = "Screenshots are not available here: no desktop display was found";

const hasDesktop = () => process.platform !== "linux" || Boolean(process.env.DISPLAY);
const NO_DESKTOP = (action) =>
  httpError(503, action + " is not available here: no desktop display was found");

const normalizeUrl = (url) => {
  assert(typeof url === "string" && url.trim(), 400, "A url is required");

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(url.trim())
    ? url.trim()
    : `https://${url.trim()}`;

  let parsed;

  try {
    parsed = new URL(candidate);
  } catch {
    throw httpError(400, "That url is not valid");
  }

  assert(
    ["http:", "https:"].includes(parsed.protocol),
    400,
    "Only http and https urls are allowed"
  );

  return parsed.toString();
};

export const listScreenshots = () => {
  if (!fs.existsSync(screenshotsDir)) {
    return [];
  }

  return fs
    .readdirSync(screenshotsDir)
    .filter((file) => file.endsWith(".png"))
    .map((file) => {
      const stat = fs.statSync(path.join(screenshotsDir, file));

      return {
        file,
        url: `/screenshots/${encodeURIComponent(file)}`,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_SCREENSHOTS);
};

const pruneScreenshots = () => {
  const files = fs
    .readdirSync(screenshotsDir)
    .filter((file) => file.endsWith(".png"))
    .map((file) => ({
      file,
      modified: fs.statSync(path.join(screenshotsDir, file)).mtimeMs,
    }))
    .sort((a, b) => b.modified - a.modified);

  files
    .slice(MAX_SCREENSHOTS)
    .forEach(({ file }) => fs.rmSync(path.join(screenshotsDir, file), { force: true }));
};

export const launchWebsite = async (url) => {
  const target = normalizeUrl(url);

  if (!hasDesktop()) {
    throw NO_DESKTOP("Opening a browser");
  }

  try {
    await open(target);
  } catch {
    throw httpError(503, "Could not open a browser in this environment");
  }

  return target;
};

export const openWebSearch = async (query) => {
  assert(typeof query === "string" && query.trim(), 400, "A search query is required");

  return launchWebsite(`https://www.google.com/search?q=${encodeURIComponent(query.trim())}`);
};

// Opens a file on the desktop, but only one that lives inside the read-only folders.
export const openFile = async (filePath) => {
  const target = resolveAllowedPath(filePath);

  if (!hasDesktop()) {
    throw NO_DESKTOP("Opening a file");
  }

  try {
    await open(target);
  } catch {
    throw httpError(503, "Could not open that file on this computer");
  }

  return target;
};

// Built-ins launch through a shell command; installed apps launch through the
// shortcut that discovery found, so no user-supplied path is ever executed.
export const resolveAppName = (app) => {
  if (typeof app !== "string" || !app.trim()) {
    return null;
  }

  const name = app.trim().toLowerCase();

  if (SUPPORTED_APPS.has(name)) {
    return { kind: "builtin", name, label: APP_LABELS[name] };
  }

  const shortcut = apps.resolveApp(name);

  return shortcut ? { kind: "shortcut", ...shortcut } : null;
};

export const listInstalledApps = () => apps.listPublicApps();

const BUILTIN_COMMANDS = {
  chrome: () => (process.platform === "win32" ? "start chrome" : "open -a 'Google Chrome'"),
  vscode: () => "code",
  calculator: () => (process.platform === "win32" ? "calc" : "open -a Calculator"),
};

export const launchApp = async (app) => {
  assert(typeof app === "string" && app.trim(), 400, "An app name is required");

  // Validate the name before looking for a display, so an unknown app is a 400
  // even on a headless machine rather than a misleading 503.
  const target = resolveAppName(app);

  if (!target) {
    const discovered = apps.listApps().length;
    const detail =
      discovered > 0
        ? `I found ${discovered} installed app${discovered === 1 ? "" : "s"} but none match "${app
            .trim()}".`
        : "I could not find any app shortcuts on this computer to search.";

    throw httpError(400, `I could not find "${app.trim()}". ${detail}`);
  }

  if (!hasDesktop()) {
    throw NO_DESKTOP("Launching applications");
  }

  try {
    if (target.kind === "builtin") {
      await execAsync(BUILTIN_COMMANDS[target.name](), { timeout: LAUNCH_TIMEOUT_MS });
    } else {
      await open(target.path);
    }
  } catch {
    throw httpError(503, `Could not launch ${target.label} on this computer`);
  }

  return target.label;
};

export const takeScreenshot = async () => {
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const fileName = `screenshot-${Date.now()}.png`;
  const target = path.join(screenshotsDir, fileName);

  try {
    if (process.platform === "win32") {
      await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-WindowStyle",
          "Hidden",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          windowsScriptPath,
          target,
        ],
        { timeout: 15000 }
      );
    } else {
      await execFileAsync(process.execPath, [workerPath, target], { timeout: 15000 });
    }
  } catch {
    throw httpError(503, NO_DISPLAY);
  }

  if (!fs.existsSync(target)) {
    throw httpError(503, NO_DISPLAY);
  }

  pruneScreenshots();

  return fileName;
};
