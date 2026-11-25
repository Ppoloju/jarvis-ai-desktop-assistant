import { useCallback, useEffect, useState } from "react";
import { getReminders, createReminder, deleteReminder } from "../../services/api";
import {
  Alert,
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  PageHeader,
} from "../../components/ui";
import { Icon } from "../../components/ui/Icons";
import { formatDateTime, pluralize } from "../../utils/format";

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

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

    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus(null);

    try {
      await createReminder(text);
      setText("");
      await refresh();
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    setStatus(null);

    try {
      await deleteReminder(id);
      await refresh();
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const newestFirst = [...reminders].reverse();

  return (
    <>
      <PageHeader
        title="Reminders"
        description="Reminders are saved to disk and stay available after a restart."
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
            placeholder="Remind me to..."
            aria-label="Reminder text"
            disabled={busy}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
          <Button type="submit" icon="plus" loading={busy} disabled={busy || !text.trim()}>
            Add reminder
          </Button>
        </form>
      </Card>

      <Card title="Your reminders" description={`${pluralize(reminders.length, "reminder")} saved`}>
        {reminders.length === 0 ? (
          <EmptyState
            icon="bell"
            title="No reminders yet"
            description="Add one above, or tell the assistant to remind you to call Sam."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {newestFirst.map((reminder) => (
              <li
                key={reminder.id}
                className="flex items-center justify-between gap-4 py-3 transition hover:bg-slate-50/60"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon name="bell" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-slate-900">
                      {reminder.text}
                    </p>
                    <p className="text-xs text-slate-500">
                      Added {formatDateTime(reminder.createdAt)}
                    </p>
                  </div>
                </div>
                <ConfirmButton
                  aria-label={`Delete reminder: ${reminder.text}`}
                  confirmLabel="Confirm"
                  disabled={busy}
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
