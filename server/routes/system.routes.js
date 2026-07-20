import express from "express";
const router = express.Router();

import { getSystemInfo } from "../controllers/system.controller.js";

router.get("/info", getSystemInfo);

export default router;