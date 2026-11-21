import fs from "fs";
import path from "path";

const storageDir = path.join(import.meta.dirname, "../../storage");

const resolveInStorage = (name) => {
  if (!name) {
    throw new Error("A file name is required");
  }

  const target = path.join(storageDir, name);

  if (!target.startsWith(storageDir)) {
    throw new Error("Path must stay inside the storage folder");
  }

  fs.mkdirSync(storageDir, { recursive: true });

  return target;
};

export const createFolder = async (folderName) => {
  const folderPath = resolveInStorage(folderName);

  fs.mkdirSync(folderPath, { recursive: true });

  return folderPath;
};

export const createFile = async (fileName, content = "") => {
  const filePath = resolveInStorage(fileName);

  fs.writeFileSync(filePath, content);

  return filePath;
};

export const renameFile = async (oldName, newName) => {
  const oldPath = resolveInStorage(oldName);
  const newPath = resolveInStorage(newName);

  fs.renameSync(oldPath, newPath);

  return newPath;
};

export const deleteFile = async (fileName) => {
  const filePath = resolveInStorage(fileName);

  fs.unlinkSync(filePath);

  return filePath;
};