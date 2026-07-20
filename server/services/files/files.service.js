const fs = require("fs");
const path = require("path");

exports.createFolder = async (folderName) => {
  const folderPath = path.join(
    __dirname,
    "../../storage",
    folderName
  );

  fs.mkdirSync(folderPath, { recursive: true });

  return folderPath;
};
exports.createFile = async (fileName, content = "") => {
  const filePath = path.join(
    __dirname,
    "../../storage",
    fileName
  );

  fs.writeFileSync(filePath, content);

  return filePath;
};
exports.renameFile = async (oldName, newName) => {
  const oldPath = path.join(
    __dirname,
    "../../storage",
    oldName
  );

  const newPath = path.join(
    __dirname,
    "../../storage",
    newName
  );

  fs.renameSync(oldPath, newPath);

  return newPath;
};
exports.deleteFile = async (fileName) => {
  const filePath = path.join(
    __dirname,
    "../../storage",
    fileName
  );

  fs.unlinkSync(filePath);

  return filePath;
};