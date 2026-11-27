import express from "express";

import {
  listFolders,
  listFolder,
  searchFiles,
} from "../../controllers/laptop/laptop.controller.js";

const router = express.Router();

// Read-only: there is intentionally no route that writes to these folders
router.get("/", listFolders);
// Declared before /:folder so "search" is not treated as a folder name
router.get("/search", searchFiles);
router.get("/:folder", listFolder);

export default router;
