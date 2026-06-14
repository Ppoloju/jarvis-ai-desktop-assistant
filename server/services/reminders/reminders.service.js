const reminders = [];

exports.addReminder = (text) => {
  const reminder = {
    id: Date.now(),
    text,
  };

  reminders.push(reminder);

  return reminder;
};

exports.getReminders = () => reminders;

exports.deleteReminder = (id) => {
  const index = reminders.findIndex(
    (r) => r.id === Number(id)
  );

  if (index === -1) {
    throw new Error("Reminder not found");
  }

  reminders.splice(index, 1);
};