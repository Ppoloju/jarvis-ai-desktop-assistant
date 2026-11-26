import fs from "fs";
import os from "os";
import path from "path";

import { assert } from "../../utils/http.js";

// Reads only. This module deliberately exposes no create, rename or delete functions.
const MAX_ENTRIES = 500;

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

const homeDir = () => process.env.JARVIS_HOME || os.homedir();

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
