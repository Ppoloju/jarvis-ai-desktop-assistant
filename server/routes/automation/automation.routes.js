import express from "express";
const router = express.Router();

import { openWebsite, openApp, captureScreenshot } from "../../controllers/automation/automation.controller.js";

router.post("/open-website", openWebsite);
router.post("/open-app", openApp);
router.post("/screenshot", captureScreenshot);
export default router;