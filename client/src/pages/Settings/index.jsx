import { useEffect, useState } from "react";
import API_BASE from "../../services/api";
import {
  getChatHistory,
  clearChatHistory,
  onChatHistoryCleared,
} from "../../utils/history";
import { Alert, Button, Card, PageHeader } from "../../components/ui";
import { pluralize } from "../../utils/format";

const rows = [
  ["Application", "Orbit Desktop Assistant"],
  ["Version", "1.0.0"],
  ["Runtime", "Local (Node + React)"],
  ["API endpoint", API_BASE || "Same origin (proxied by Vite)"],
  ["Data storage", "SQLite (server/storage/orbit.db) and browser localStorage"],
];

const privacy = [
  "Everything stays on this computer. There is no account, analytics, telemetry or cloud sync.",
  "The API listens on 127.0.0.1 only, rejects requests addressed to other hostnames, and sends no-store caching for its data.",
  "Files are plain files on this machine and reminders plus chat memory live in a local SQLite database; treat that folder like any other local data.",
  "Voice input is handled by your browser and may be sent to its speech service. Typing never leaves the machine.",
  "Web pages and searches open in your own browser. Nothing else is fetched from the internet.",
];

export default function Settings() {
  const [stored, setStored] = useState(() => getChatHistory().length);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const sync = () => setStored(getChatHistory().length);

    const unsubscribe = onChatHistoryCleared(sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <>
      <PageHeader title="Settings" description="Local configuration and stored data." />

      <div className="space-y-5">
        <Card title="About this app">
          <dl className="divide-y divide-slate-100">
            {rows.map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2 py-2.5">
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="text-sm font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Privacy and security" description="What leaves this computer, and what does not.">
          <ul className="space-y-2 text-sm text-slate-600">
            {privacy.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Conversation history"
          description="Stored in this browser. Clearing it cannot be undone."
        >
          {cleared && (
            <div className="mb-3">
              <Alert tone="success" onDismiss={() => setCleared(false)}>
                Conversation history cleared.
              </Alert>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {stored === 0
                ? "There are no saved messages."
                : `${pluralize(stored, "saved message")} in this browser.`}
            </p>
            <Button
              variant="danger"
              icon="trash"
              disabled={stored === 0}
              onClick={() => {
                clearChatHistory();
                setStored(0);
                setCleared(true);
              }}
            >
              Clear conversation history
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
