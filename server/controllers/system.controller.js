import * as systemService from "../services/system/system.service.js";
import * as aiService from "../services/ai/ai.service.js";
import * as backupService from "../services/db/backup.service.js";

export const getSystemInfo = async (req, res) => {
  const info = await systemService.getSystemInfo();

  res.json(info);
};

export const getAiStatus = async (req, res) => {
  res.json(await aiService.status({ refresh: req.query.refresh === "1" }));
};

export const setAiModel = async (req, res) => {
  res.json(await aiService.setLocalModel(req.body?.model));
};

export const listBackups = (req, res) => {
  res.json({ success: true, backups: backupService.listBackups() });
};

export const createBackup = (req, res) => {
  res.json({ success: true, backup: backupService.createBackup() });
};

export const openDataFolder = async (req, res) => {
  const folder = await systemService.openDataFolder();

  res.json({ success: true, folder });
};
