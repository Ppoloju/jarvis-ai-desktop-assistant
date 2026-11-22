import { useCallback, useEffect, useState } from "react";
import { getReminders, createReminder, deleteReminder } from "../../services/api";
import { Alert, Button, Card, EmptyState, PageHeader } from "../../components/ui";
import { Icon } from "../../components/ui/Icons";

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

  return (
    <>
      <PageHeader
        title="Reminders"
        description="Reminders are saved to disk and stay available after a restart."
      />

      {status && (
        <div className="mb-5">
          <Alert tone={status.tone}>{status.text}</Alert>
        </div>
      )}

      <Card className="mb-5">
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Remind me to..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <Button type="submit" icon="plus" loading={busy} disabled={busy || !text.trim()}>
            Add reminder
          </Button>
        </form>
      </Card>

      <Card title="Your reminders" description={`${reminders.length} saved`}>
        {reminders.length === 0 ? (
          <EmptyState
            icon="bell"
            title="No reminders yet"
            description="Add one above, or tell the assistant: “remind me to call Sam”."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon name="bell" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{reminder.text}</p>
                    <p className="text-xs text-slate-500">
                      Added {new Date(reminder.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="trash"
                  className="text-red-600 hover:bg-red-50"
                  disabled={busy}
                  onClick={() => handleDelete(reminder.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
