const express = require("express");
const router = express.Router();

const automationController = require("../../controllers/automation/automation.controller");

router.post("/open-website", automationController.openWebsite);
router.post("/open-app", automationController.openApp);

module.exports = router;