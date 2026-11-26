import * as remindersService from "../../services/reminders/reminders.service.js";

export const createReminder = (req, res) => {
  const { text } = req.body ?? {};

  const reminder = remindersService.addReminder(text);

  res.status(201).json({
    success: true,
    reminder,
  });
};

export const getReminders = (req, res) => {
  res.json({ success: true, reminders: remindersService.getReminders() });
};

export const updateReminder = (req, res) => {
  const { completed } = req.body ?? {};

  const reminder = remindersService.setCompleted(req.params.id, completed);

  res.json({
    success: true,
    reminder,
  });
};

export const deleteReminder = (req, res) => {
  const removed = remindersService.deleteReminder(req.params.id);

  res.json({
    success: true,
    reminder: removed,
  });
};
