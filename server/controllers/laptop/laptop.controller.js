import * as laptopService from "../../services/laptop/laptop.service.js";

export const listFolders = async (req, res) => {
  res.json({ success: true, folders: laptopService.listFolders() });
};

export const listFolder = async (req, res) => {
  const listing = await laptopService.listFolder(req.params.folder, req.query.path ?? "");

  res.json({ success: true, ...listing });
};

export const searchFiles = async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  const matches = laptopService.searchEntries(query);

  res.json({ success: true, query: query.trim(), matches });
};
