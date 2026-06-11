const express = require("express");
const router = express.Router();

const automationController = require("../../controllers/automation/automation.controller");

router.post("/open-website", automationController.openWebsite);

module.exports = router;