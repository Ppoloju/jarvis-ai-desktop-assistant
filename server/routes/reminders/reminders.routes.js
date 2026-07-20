const express = require("express");
const router = express.Router();

const remindersController =
  require("../../controllers/reminders/reminders.controller");

router.post("/", remindersController.createReminder);
router.get("/", remindersController.getReminders);
router.delete("/:id", remindersController.deleteReminder);

module.exports = router;