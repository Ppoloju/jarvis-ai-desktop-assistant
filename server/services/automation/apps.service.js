import fs from "fs";
import os from "os";
import path from "path";

// Read-only discovery of the shortcuts a user already has. Nothing here writes
// anywhere, and only paths found by the scan can ever be launched.
const MAX_DEPTH = 4;
const MAX_VISITED = 3000;
const MAX_APPS = 400;
const CACHE_TTL_MS = 60_000;
const SHORTCUT_EXTENSIONS = [".lnk", ".appref-ms"];

let cache = { apps: [], loadedAt: 0 };

const overrideDirs = () => {
  const raw = process.env.ORBIT_APPS_DIR;

  if (!raw || !raw.trim()) {
    return null;
  }

  return raw
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const defaultDirs = () => {
  if (process.platform === "win32") {
    const dirs = [];

    if (process.env.APPDATA) {
      dirs.push(path.join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs"));
    }

    if (process.env.ProgramData) {
      dirs.push(path.join(process.env.ProgramData, "Microsoft", "Windows", "Start Menu", "Programs"));
    }

    return dirs;
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

const appDirs = () => {
  const configured = overrideDirs();

  return configured ?? defaultDirs();
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

const isAppBundle = (name, isFolder) =>
  isFolder && path.extname(name).toLowerCase() === ".app";

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

    if (dirent.isDirectory()) {
      if (isAppBundle(dirent.name, true)) {
        const label = cleanLabel(dirent.name);
        const name = normalizeAppName(label);

        if (name && !seen.has(name)) {
          seen.add(name);
          apps.push({ name, label, path: entryPath });
        }

        continue;
      }

      collect(apps, seen, entryPath, depth + 1);
      continue;
    }

    if (!dirent.isFile() || !isShortcutFile(dirent.name)) {
      continue;
    }

    const label = cleanLabel(dirent.name);

    if (!label || SKIP_LABEL.test(label)) {
      continue;
    }

    const name = normalizeAppName(label);

    if (!name || seen.has(name)) {
      continue;
    }

    seen.add(name);
    apps.push({ name, label, path: entryPath });
  }
};

const scan = () => {
  const apps = [];
  const seen = new Set();
  let visited = 0;

  for (const directory of appDirs()) {
    if (apps.length >= MAX_APPS || visited >= MAX_VISITED) {
      break;
    }

    visited += 1;
    collect(apps, seen, directory, 0);
  }

  return apps.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
};

export const listApps = ({ refresh = false } = {}) => {
  const fresh = Date.now() - cache.loadedAt < CACHE_TTL_MS;

  if (!refresh && fresh && cache.apps.length > 0) {
    return cache.apps.map((app) => ({ ...app }));
  }

  const apps = scan();

  // Keep an empty result only briefly, so installing an app shows up soon.
  cache = {
    apps,
    loadedAt: apps.length > 0 ? Date.now() : Date.now() - CACHE_TTL_MS / 2,
  };

  return apps.map((app) => ({ ...app }));
};

const PUBLIC_APP = (app) => ({ name: app.name, label: app.label });

export const listPublicApps = () => listApps().map(PUBLIC_APP);

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

export const clearAppCache = () => {
  cache = { apps: [], loadedAt: 0 };
};
