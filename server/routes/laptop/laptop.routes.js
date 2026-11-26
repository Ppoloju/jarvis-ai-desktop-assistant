import express from "express";

import { listFolders, listFolder } from "../../controllers/laptop/laptop.controller.js";

const router = express.Router();

// Read-only: there is intentionally no route that writes to these folders
router.get("/", listFolders);
router.get("/:folder", listFolder);

export default router;
