import express from "express";

const router = express.Router();

import {
  listFiles,
  createFolder,
  createFile,
  renameFile,
  deleteFile,
} from "../../controllers/files/files.controller.js";

router.get("/", listFiles);
router.post("/create-folder", createFolder);
router.post("/create-file", createFile);
router.patch("/rename-file", renameFile);
router.delete("/delete-file", deleteFile);

export default router;
