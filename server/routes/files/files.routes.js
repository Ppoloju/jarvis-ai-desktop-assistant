import express from "express";
const router = express.Router();

import { createFolder, createFile, renameFile, deleteFile } from "../../controllers/files/files.controller.js";
router.post("/create-folder", createFolder);
router.post("/create-file", createFile);
router.patch("/rename-file", renameFile);
router.delete("/delete-file", deleteFile);
export default router;