import { useCallback, useEffect, useState } from "react";
import {
  getReminders,
  createReminder,
  setReminderDone,
  deleteReminder,
} from "../../services/api";
import {
  Alert,
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  PageHeader,
} from "../../components/ui";
import { formatDateTime, pluralize } from "../../utils/format";

const REFRESH_MS = 20_000;

const isOverdue = (reminder) =>
  Boolean(reminder.dueAt) && !reminder.completed && new Date(reminder.dueAt) <= new Date();

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await getReminders();
      setReminders(data.reminders);
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
    }
  }, []);

  useEffect(() => {
    let active = true;

    getReminders()
      .then((data) => {
        if (active) setReminders(data.reminders);
      })
      .catch((error) => {
        if (active) setStatus({ tone: "error", text: error.message });
      });

    // Pick up reminders that fired while this page was open
    const timer = setInterval(() => {
      if (active) refresh();
    }, REFRESH_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [refresh]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setBusy("create");
    setStatus(null);

    try {
      const data = await createReminder(text);
      setText("");
      await refresh();
      setStatus({
        tone: "success",
        text: data.reminder.dueAt
          ? `Reminder set. I will remind you ${formatDateTime(data.reminder.dueAt)}.`
          : "Reminder added.",
      });
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
    } finally {
      setBusy("");
    }
  };

  const handleToggle = async (reminder) => {
    setBusy(reminder.id);
    setStatus(null);

    try {
      await setReminderDone(reminder.id, !reminder.completed);
      await refresh();
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
    } finally {
      setBusy("");
    }
  };

  const handleDelete = async (id) => {
    setBusy(id);
    setStatus(null);

    try {
      await deleteReminder(id);
      await refresh();
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
    } finally {
      setBusy("");
    }
  };

  const ordered = [...reminders].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;

    if (aDue !== bDue) return aDue - bDue;

    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <>
      <PageHeader
        title="Reminders"
        description="Timed reminders pop up as a desktop notification while Orbit is running. Everything is saved to disk."
      />

      {status && (
        <div className="mb-5">
          <Alert tone={status.tone} onDismiss={() => setStatus(null)}>
            {status.text}
          </Alert>
        </div>
      )}

      <Card className="mb-5">
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder='Remind me to... (try "in 20 minutes")'
            aria-label="Reminder text"
            disabled={busy !== ""}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
          <Button
            type="submit"
            icon="plus"
            loading={busy === "create"}
            disabled={busy !== "" || !text.trim()}
          >
            Add reminder
          </Button>
        </form>
      </Card>

      <Card title="Your reminders" description={`${pluralize(reminders.length, "reminder")} saved`}>
        {reminders.length === 0 ? (
          <EmptyState
            icon="bell"
            title="No reminders yet"
            description='Add one above, or tell the assistant "remind me to call Sam in 10 minutes".'
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {ordered.map((reminder) => (
              <li
                key={reminder.id}
                className="flex items-center justify-between gap-4 py-3 transition hover:bg-slate-50/60"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={reminder.completed}
                    disabled={busy !== ""}
                    onChange={() => handleToggle(reminder)}
                    aria-label={`Mark "${reminder.text}" as ${reminder.completed ? "open" : "done"}`}
                    className="mt-1.5 h-4 w-4 shrink-0 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <div className="min-w-0">
                    <p
                      className={`break-words text-sm font-medium ${
                        reminder.completed ? "text-slate-500 line-through" : "text-slate-900"
                      }`}
                    >
                      {reminder.text}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      {reminder.dueAt && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                            isOverdue(reminder)
                              ? "bg-red-50 text-red-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {reminder.notifiedAt ? "Sent" : isOverdue(reminder) ? "Due now" : "Due"}{" "}
                          {formatDateTime(reminder.dueAt)}
                        </span>
                      )}
                      {reminder.repeat && (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                          {reminder.repeat === "weekly" ? "Weekly" : "Daily"}
                        </span>
                      )}
                      <span>Added {formatDateTime(reminder.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <ConfirmButton
                  aria-label={`Delete reminder: ${reminder.text}`}
                  confirmLabel="Confirm delete"
                  confirmAriaLabel={`Confirm delete: ${reminder.text}`}
                  disabled={busy !== ""}
                  loading={busy === reminder.id}
                  onConfirm={() => handleDelete(reminder.id)}
                >
                  Delete
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
