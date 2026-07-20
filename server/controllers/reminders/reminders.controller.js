const remindersService = require("../../services/reminders/reminders.service");

exports.createReminder = (req, res) => {
  try {
    const { text } = req.body;

    const reminder =
      remindersService.addReminder(text);

    res.json({
      success: true,
      reminder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getReminders = (req, res) => {
  res.json(remindersService.getReminders());
};

exports.deleteReminder = (req, res) => {
  try {
    remindersService.deleteReminder(req.params.id);

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};