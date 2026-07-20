const express = require("express");
const router = express.Router();

const filesController = require("../../controllers/files/files.controller");
router.post("/create-folder", filesController.createFolder);
router.post("/create-file", filesController.createFile);
router.patch("/rename-file", filesController.renameFile);
router.delete("/delete-file", filesController.deleteFile);
module.exports = router;