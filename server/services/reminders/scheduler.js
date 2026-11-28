import * as reminders from "./reminders.service.js";
import { notify } from "./notifications.service.js";

const TICK_MS = 20_000;

// Announces everything that has come due since the last tick.
export const fireDueReminders = (now = new Date()) => {
  const fired = reminders.markDueNotified(now);

  fired.forEach((reminder) => notify("Orbit reminder", reminder.text));

  return fired;
};

export const startReminderScheduler = () => {
  const tick = () => {
    try {
      fireDueReminders();
    } catch (error) {
      console.error("Reminder check failed:", error.message);
    }
  };

  tick();

  const timer = setInterval(tick, TICK_MS);
  timer.unref();

  return timer;
};
