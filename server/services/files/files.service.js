import fs from "fs";
import path from "path";

export const createFolder = async (folderName) => {
  const folderPath = path.join(
    import.meta.dirname,
    "../../storage",
    folderName
  );

  fs.mkdirSync(folderPath, { recursive: true });

  return folderPath;
};

export const createFile = async (fileName, content = "") => {
  const filePath = path.join(
    import.meta.dirname,
    "../../storage",
    fileName
  );

  fs.writeFileSync(filePath, content);

  return filePath;
};

export const renameFile = async (oldName, newName) => {
  const oldPath = path.join(
    import.meta.dirname,
    "../../storage",
    oldName
  );

  const newPath = path.join(
    import.meta.dirname,
    "../../storage",
    newName
  );

  fs.renameSync(oldPath, newPath);

  return newPath;
};

export const deleteFile = async (fileName) => {
  const filePath = path.join(
    import.meta.dirname,
    "../../storage",
    fileName
  );

  fs.unlinkSync(filePath);

  return filePath;
};