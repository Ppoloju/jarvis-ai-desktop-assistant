import fs from "fs";
import os from "os";
import path from "path";

import { assert, httpError } from "../../utils/http.js";

// Reads only. This module deliberately exposes no create, rename or delete functions.
const MAX_ENTRIES = 500;
const SEARCH_MAX_RESULTS = 10;
const SEARCH_MAX_DEPTH = 4;
const SEARCH_MAX_VISITED = 4000;

const FOLDER_DEFINITIONS = [
  {
    key: "desktop",
    label: "Desktop",
    candidates: ["Desktop", path.join("OneDrive", "Desktop")],
  },
  {
    key: "documents",
    label: "Documents",
    candidates: ["Documents", path.join("OneDrive", "Documents")],
  },
  {
    key: "downloads",
    label: "Downloads",
    candidates: ["Downloads"],
  },
];

const homeDir = () => process.env.ORBIT_HOME || os.homedir();

const isDirectory = (target) => {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
};

const resolveRoot = (definition) => {
  const candidates = definition.candidates.map((relative) => path.join(homeDir(), relative));
  const found = candidates.find(isDirectory);

  return {
    path: found || candidates[0],
    exists: Boolean(found),
  };
};

const isInside = (root, target) => {
  const relative = path.relative(root, target);

  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

const readEntries = (directory) => {
  const dirents = fs.readdirSync(directory, { withFileTypes: true });

  let seen = 0;
  const entries = [];

  for (const dirent of dirents) {
    // Never follow links out of the selected folder
    if (dirent.isSymbolicLink()) {
      continue;
    }

    seen += 1;

    if (entries.length >= MAX_ENTRIES) {
      continue;
    }

    try {
      const entryPath = path.join(directory, dirent.name);
      const stat = fs.lstatSync(entryPath);
      const isFolder = stat.isDirectory();

      if (!isFolder && !stat.isFile()) {
        continue;
      }

      entries.push({
        name: dirent.name,
        type: isFolder ? "folder" : "file",
        size: isFolder ? null : stat.size,
        modified: stat.mtime.toISOString(),
      });
    } catch {
      // The entry vanished or is unreadable; skip it
    }
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return { entries, truncated: seen > MAX_ENTRIES };
};

export const listFolders = () =>
  FOLDER_DEFINITIONS.map((definition) => {
    const root = resolveRoot(definition);
    let count = null;

    if (root.exists) {
      try {
        count = readEntries(root.path).entries.length;
      } catch {
        count = null;
      }
    }

    return {
      key: definition.key,
      label: definition.label,
      exists: root.exists,
      path: root.path,
      count,
    };
  });

export const listFolder = async (key, subPath = "") => {
  const definition = FOLDER_DEFINITIONS.find((item) => item.key === String(key).toLowerCase());

  assert(definition, 404, "Unknown folder");

  const root = resolveRoot(definition);

  assert(root.exists, 404, `${definition.label} was not found on this computer`);

  const relative = typeof subPath === "string" ? subPath.trim() : "";

  assert(!path.isAbsolute(relative), 400, "Path must be relative to the folder");

  const realRoot = fs.realpathSync(root.path);
  const target = path.resolve(realRoot, relative);

  assert(isInside(realRoot, target), 400, "Path must stay inside the folder");
  assert(fs.existsSync(target), 404, "That path does not exist");
  assert(fs.statSync(target).isDirectory(), 400, "That path is not a folder");
  assert(isInside(realRoot, fs.realpathSync(target)), 400, "Path must stay inside the folder");

  const segments = relative.split(/[\\/]+/).filter(Boolean);
  const { entries, truncated } = readEntries(target);

  return {
    key: definition.key,
    label: definition.label,
    path: target,
    segments,
    entries,
    truncated,
    readOnly: true,
  };
};

// Cheap, bounded filename search across the three read-only folders.
export const searchEntries = (query, limit = SEARCH_MAX_RESULTS) => {
  const term = typeof query === "string" ? query.trim().toLowerCase() : "";

  assert(term.length >= 2, 400, "A search needs at least two characters");

  const matches = [];
  let visited = 0;

  const walk = (directory, depth, definition) => {
    if (depth > SEARCH_MAX_DEPTH || visited >= SEARCH_MAX_VISITED) {
      return;
    }

    let dirents;

    try {
      dirents = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const dirent of dirents) {
      if (matches.length >= limit || visited >= SEARCH_MAX_VISITED) {
        return;
      }

      // Never follow links out of the selected folder
      if (dirent.isSymbolicLink()) {
        continue;
      }

      const entryPath = path.join(directory, dirent.name);
      visited += 1;

      let stat;

      try {
        stat = fs.lstatSync(entryPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(entryPath, depth + 1, definition);
        continue;
      }

      if (!stat.isFile() || !dirent.name.toLowerCase().includes(term)) {
        continue;
      }

      matches.push({
        name: dirent.name,
        path: entryPath,
        folder: definition.label,
        size: stat.size,
        modified: stat.mtime.toISOString(),
      });
    }
  };

  for (const definition of FOLDER_DEFINITIONS) {
    const root = resolveRoot(definition);

    if (!root.exists) {
      continue;
    }

    walk(root.path, 0, definition);

    if (matches.length >= limit) {
      break;
    }
  }

  // Shorter names usually mean a better match, so float them to the top
  return matches.sort((a, b) => a.name.length - b.name.length).slice(0, limit);
};

// Resolve a user-supplied path and prove it is a real file inside an allowed folder.
export const resolveAllowedPath = (target) => {
  assert(typeof target === "string" && target.trim(), 400, "A file path is required");

  const resolved = path.resolve(target.trim());

  for (const definition of FOLDER_DEFINITIONS) {
    const root = resolveRoot(definition);

    if (!root.exists) {
      continue;
    }

    const realRoot = fs.realpathSync(root.path);

    if (!isInside(realRoot, resolved)) {
      continue;
    }

    assert(fs.existsSync(resolved), 404, "That file no longer exists");

    const real = fs.realpathSync(resolved);

    assert(isInside(realRoot, real), 400, "Path must stay inside the folder");
    assert(fs.statSync(real).isFile(), 400, "That path is not a file");

    return real;
  }

  throw httpError(400, "I can only open files inside Desktop, Documents or Downloads");
};
