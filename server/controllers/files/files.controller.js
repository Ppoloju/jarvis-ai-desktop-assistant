import * as filesService from "../../services/files/files.service.js";

export const listFiles = async (req, res) => {
  const entries = await filesService.listFiles();

  res.json({ success: true, entries });
};

export const readFile = async (req, res) => {
  const file = await filesService.readFile(req.query.name);

  res.json({ success: true, file });
};

export const createFolder = async (req, res) => {
  const { folderName } = req.body ?? {};

  const folderPath = await filesService.createFolder(folderName);

  res.status(201).json({
    success: true,
    path: folderPath,
  });
};

export const createFile = async (req, res) => {
  const { fileName, content } = req.body ?? {};

  const filePath = await filesService.createFile(fileName, content);

  res.status(201).json({
    success: true,
    path: filePath,
  });
};

export const renameFile = async (req, res) => {
  const { oldName, newName } = req.body ?? {};

  const newPath = await filesService.renameFile(oldName, newName);

  res.json({
    success: true,
    path: newPath,
  });
};

export const deleteFile = async (req, res) => {
  const { fileName } = req.body ?? {};

  await filesService.deleteFile(fileName);

  res.json({
    success: true,
    message: `${fileName} deleted`,
  });
};
