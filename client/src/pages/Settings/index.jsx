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
  ["API endpoint", API_BASE || "Same origin (proxied by nginx or Vite)"],
  ["Data storage", "server/storage and browser localStorage"],
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
