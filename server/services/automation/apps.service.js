import fs from "fs";
import os from "os";
import path from "path";

// Read-only discovery of the shortcuts a user already has. Nothing here writes
// anywhere, and only paths found by the scan can ever be launched.
const MAX_DEPTH = 4;
const MAX_APPS = 400;
const CACHE_TTL_MS = 60_000;
const SHORTCUT_EXTENSIONS = [".lnk", ".appref-ms"];

let cache = { apps: [], loadedAt: 0 };

const appDirs = () => {
  const override = process.env.ORBIT_APPS_DIR?.trim();

  if (override) {
    return override
      .split(path.delimiter)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (process.platform === "win32") {
    const startMenu = ["Microsoft", "Windows", "Start Menu", "Programs"];

    return [process.env.APPDATA, process.env.ProgramData]
      .filter(Boolean)
      .map((root) => path.join(root, ...startMenu));
  }

  if (process.platform === "darwin") {
    return [
      path.join(os.homedir(), "Applications"),
      "/Applications",
      "/System/Applications",
    ];
  }

  // Other platforms have no single reliable shortcut location.
  return [];
};

export const normalizeAppName = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const cleanLabel = (fileName) =>
  fileName
    .replace(/\.(lnk|appref-ms|app)$/i, "")
    .replace(/\s*-\s*shortcut$/i, "")
    .replace(/\s+/g, " ")
    .trim();

// Installers and readme links are in the same folders but are not apps.
const SKIP_LABEL = /^(uninstall|readme|licen[cs]e|release notes)\b/i;

const isShortcutFile = (name) =>
  SHORTCUT_EXTENSIONS.includes(path.extname(name).toLowerCase());

const isAppBundle = (name) => path.extname(name).toLowerCase() === ".app";

const collect = (apps, seen, directory, depth) => {
  if (depth > MAX_DEPTH) {
    return;
  }

  let dirents;

  try {
    dirents = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const dirent of dirents) {
    if (apps.length >= MAX_APPS) {
      return;
    }

    // Never follow links out of the shortcut folders
    if (dirent.isSymbolicLink()) {
      continue;
    }

    const entryPath = path.join(directory, dirent.name);
    const isFolder = dirent.isDirectory();

    if (isFolder && !isAppBundle(dirent.name)) {
      collect(apps, seen, entryPath, depth + 1);
      continue;
    }

    if (!isFolder && !(dirent.isFile() && isShortcutFile(dirent.name))) {
      continue;
    }

    const label = cleanLabel(dirent.name);
    const name = normalizeAppName(label);

    if (!name || seen.has(name) || (!isFolder && SKIP_LABEL.test(label))) {
      continue;
    }

    seen.add(name);
    apps.push({ name, label, path: entryPath });
  }
};

const scan = () => {
  const apps = [];
  const seen = new Set();

  for (const directory of appDirs()) {
    if (apps.length >= MAX_APPS) {
      break;
    }

    collect(apps, seen, directory, 0);
  }

  return apps.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  );
};

export const listApps = () => {
  if (Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.apps;
  }

  const apps = scan();

  // An empty result is not cached, so an app installed later shows up on the next scan.
  cache = { apps, loadedAt: apps.length > 0 ? Date.now() : 0 };

  return apps;
};

export const listPublicApps = () =>
  listApps().map(({ name, label }) => ({ name, label }));

// Match a spoken or typed name against the discovered shortcuts.
export const resolveApp = (query) => {
  const needle = normalizeAppName(query);

  if (!needle) {
    return null;
  }

  const apps = listApps();

  const exact = apps.find((app) => app.name === needle);

  if (exact) {
    return exact;
  }

  const prefixed = apps
    .filter((app) => app.name.startsWith(needle))
    .sort((a, b) => a.name.length - b.name.length)[0];

  if (prefixed) {
    return prefixed;
  }

  const words = needle.split(" ").filter(Boolean);
  const containing = apps
    .filter((app) => words.every((word) => app.name.includes(word)))
    .sort((a, b) => a.name.length - b.name.length)[0];

  return containing ?? null;
};
