import * as laptopService from "../../services/laptop/laptop.service.js";

export const listFolders = async (req, res) => {
  res.json({ success: true, folders: laptopService.listFolders() });
};

export const listFolder = async (req, res) => {
  const listing = await laptopService.listFolder(req.params.folder, req.query.path ?? "");

  res.json({ success: true, ...listing });
};
