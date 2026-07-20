import express from "express";
const router = express.Router();

import { createReminder, getReminders, deleteReminder } from "../../controllers/reminders/reminders.controller.js";

router.post("/", createReminder);
router.get("/", getReminders);
router.delete("/:id", deleteReminder);

export default router;