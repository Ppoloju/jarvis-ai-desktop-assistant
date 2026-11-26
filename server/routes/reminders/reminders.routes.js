import express from "express";
const router = express.Router();

import {
  createReminder,
  getReminders,
  updateReminder,
  deleteReminder,
} from "../../controllers/reminders/reminders.controller.js";

router.post("/", createReminder);
router.get("/", getReminders);
router.patch("/:id", updateReminder);
router.delete("/:id", deleteReminder);

export default router;