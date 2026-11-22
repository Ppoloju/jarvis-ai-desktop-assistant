import fs from "fs";
import path from "path";

import { assert } from "../../utils/http.js";

const dataDir = process.env.JARVIS_DATA_DIR || path.join(import.meta.dirname, "../..");
const storageDir = path.join(dataDir, "storage");

const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

const resolveInStorage = (name) => {
  assert(typeof name === "string" && name.trim(), 400, "A name is required");

  const target = path.resolve(storageDir, name.trim());
  const relative = path.relative(storageDir, target);

  assert(
    !relative.startsWith("..") && !path.isAbsolute(relative),
    400,
    "Path must stay inside the storage folder"
  );

  assert(!reservedNames.test(path.basename(target)), 400, "That name is reserved");

  return target;
};

const ensureStorage = () => fs.mkdirSync(storageDir, { recursive: true });

// Internal files that belong to the app, not to the user's storage view
const INTERNAL_FILES = new Set(["reminders.json"]);

export const listFiles = async () => {
  ensureStorage();

  return fs
    .readdirSync(storageDir, { withFileTypes: true })
    .filter((entry) => !INTERNAL_FILES.has(entry.name))
    .map((entry) => {
      const stat = fs.statSync(path.join(storageDir, entry.name));

      return {
        name: entry.name,
        type: entry.isDirectory() ? "folder" : "file",
        size: entry.isDirectory() ? null : stat.size,
        modified: stat.mtime.toISOString(),
      };
    });
};

export const createFolder = async (folderName) => {
  const folderPath = resolveInStorage(folderName);

  assert(!fs.existsSync(folderPath), 409, "That folder already exists");

  fs.mkdirSync(folderPath, { recursive: true });

  return path.relative(storageDir, folderPath);
};

export const createFile = async (fileName, content = "") => {
  const filePath = resolveInStorage(fileName);

  assert(!fs.existsSync(filePath), 409, "That file already exists");

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);

  return path.relative(storageDir, filePath);
};

export const renameFile = async (oldName, newName) => {
  const oldPath = resolveInStorage(oldName);
  const newPath = resolveInStorage(newName);

  assert(fs.existsSync(oldPath), 404, "That file does not exist");
  assert(!fs.existsSync(newPath), 409, "The new name is already taken");

  fs.mkdirSync(path.dirname(newPath), { recursive: true });
  fs.renameSync(oldPath, newPath);

  return path.relative(storageDir, newPath);
};

export const deleteFile = async (fileName) => {
  const filePath = resolveInStorage(fileName);

  assert(fs.existsSync(filePath), 404, "That file does not exist");

  fs.rmSync(filePath, { recursive: true });

  return path.relative(storageDir, filePath);
};
