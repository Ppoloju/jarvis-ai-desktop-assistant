import express from "express";
const router = express.Router();

import {
  getSystemInfo,
  getAiStatus,
  setAiModel,
  listBackups,
  createBackup,
  openDataFolder,
} from "../controllers/system.controller.js";

router.get("/info", getSystemInfo);
router.get("/ai", getAiStatus);
router.put("/ai/model", setAiModel);
router.get("/backup", listBackups);
router.post("/backup", createBackup);
router.post("/open-data-folder", openDataFolder);

export default router;
