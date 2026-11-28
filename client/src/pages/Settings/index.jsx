import { useEffect, useState } from "react";
import API_BASE, {
  getAiStatus,
  setAiModel,
  listBackups,
  createBackup,
  openDataFolder,
} from "../../services/api";
import {
  getChatHistory,
  clearChatHistory,
  onChatHistoryCleared,
} from "../../utils/history";
import { Alert, Button, Card, PageHeader } from "../../components/ui";
import { pluralize, formatSize, formatDateTime } from "../../utils/format";

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
  "Free-form chat uses a local Ollama model when one is running. If you set an AI key instead, unmatched questions go to that provider; commands never leave this computer.",
  "Voice input is handled by your browser and may be sent to its speech service. Typing never leaves the machine.",
  "Web pages and searches open in your own browser.",
];

const providerLabel = (ai) => {
  if (!ai.configured) return "No model";
  return ai.provider === "local" ? "Local (Ollama)" : "Remote provider";
};

export default function Settings() {
  const [stored, setStored] = useState(() => getChatHistory().length);
  const [cleared, setCleared] = useState(false);

  const [ai, setAi] = useState(null);
  const [aiError, setAiError] = useState("");
  const [aiChecking, setAiChecking] = useState(true);
  const [modelBusy, setModelBusy] = useState(false);

  const [backups, setBackups] = useState([]);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState(null);
  const [folderBusy, setFolderBusy] = useState(false);
  const [folderMessage, setFolderMessage] = useState(null);

  const loadAi = async (refresh = false) => {
    setAiChecking(true);
    setAiError("");

    try {
      setAi(await getAiStatus(refresh));
    } catch (error) {
      setAiError(error.message);
    } finally {
      setAiChecking(false);
    }
  };

  const loadBackups = async () => {
    try {
      const data = await listBackups();

      setBackups(data.backups || []);
    } catch {
      // The API may not be running yet; the button reports that when used.
    }
  };

  useEffect(() => {
    let active = true;

    getAiStatus()
      .then((data) => {
        if (active) setAi(data);
      })
      .catch((error) => {
        if (active) setAiError(error.message);
      })
      .finally(() => {
        if (active) setAiChecking(false);
      });

    listBackups()
      .then((data) => {
        if (active) setBackups(data.backups || []);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

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

  const handleModel = async (event) => {
    setModelBusy(true);
    setAiError("");

    try {
      setAi(await setAiModel(event.target.value));
    } catch (error) {
      setAiError(error.message);
    } finally {
      setModelBusy(false);
    }
  };

  const handleBackup = async () => {
    setBackupBusy(true);
    setBackupMessage(null);

    try {
      const data = await createBackup();

      setBackupMessage({
        tone: "success",
        text:
          "Saved " + data.backup.file + " (" + formatSize(data.backup.size) + ") in the backups folder.",
      });
      await loadBackups();
    } catch (error) {
      setBackupMessage({ tone: "error", text: error.message });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleOpenFolder = async () => {
    setFolderBusy(true);
    setFolderMessage(null);

    try {
      await openDataFolder();
      setFolderMessage({ tone: "success", text: "Opened the data folder." });
    } catch (error) {
      setFolderMessage({ tone: "error", text: error.message });
    } finally {
      setFolderBusy(false);
    }
  };

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
          title="AI model"
          description="Commands always run locally. A model is only used when nothing matches."
          action={
            <Button
              variant="secondary"
              size="sm"
              icon="refresh"
              loading={aiChecking}
              onClick={() => loadAi(true)}
            >
              Check again
            </Button>
          }
        >
          {aiError && (
            <Alert tone="error" onDismiss={() => setAiError("")}>
              Could not check the model: {aiError}
            </Alert>
          )}

          {!aiError && aiChecking && !ai && (
            <p className="text-sm text-slate-500">Checking for a local model…</p>
          )}

          {ai && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
                    (ai.configured
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600")
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      "h-1.5 w-1.5 rounded-full " +
                      (ai.configured ? "bg-emerald-500" : "bg-slate-400")
                    }
                  />
                  {providerLabel(ai)}
                </span>
                {ai.configured && (
                  <span className="font-mono text-sm text-slate-900">{ai.model}</span>
                )}
              </div>

              {ai.configured ? (
                <p className="text-sm text-slate-600">
                  {ai.provider === "local"
                    ? "Replies are generated on this computer by Ollama. Nothing from a conversation is sent to the internet."
                    : "Unmatched questions are sent to " +
                      ai.baseUrl +
                      ". Commands and stored data stay on this computer."}
                </p>
              ) : (
                <p className="text-sm text-slate-600">{ai.hint}</p>
              )}

              {ai.models && ai.models.length > 0 && (
                <label className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>Local model</span>
                  <select
                    value={ai.preferred || ""}
                    onChange={handleModel}
                    disabled={modelBusy}
                    aria-label="Local model"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <option value="">Automatic</option>
                    {ai.preferred && !ai.models.includes(ai.preferred) && (
                      <option value={ai.preferred} disabled>
                        {ai.preferred} (not installed)
                      </option>
                    )}
                    {ai.models.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {modelBusy && <span className="text-xs text-slate-500">Saving…</span>}
                </label>
              )}

              <p className="text-xs text-slate-500">
                A local model keeps conversations on this computer. Setting{" "}
                <code className="font-mono">AI_API_KEY</code> takes priority and sends unmatched
                questions to that provider instead.
              </p>
            </div>
          )}
        </Card>

        <Card
          title="Your data"
          description="Reminders and chat memory live in one SQLite file inside the data folder."
        >
          {backupMessage && (
            <div className="mb-3">
              <Alert tone={backupMessage.tone} onDismiss={() => setBackupMessage(null)}>
                {backupMessage.text}
              </Alert>
            </div>
          )}

          {folderMessage && (
            <div className="mb-3">
              <Alert tone={folderMessage.tone} onDismiss={() => setFolderMessage(null)}>
                {folderMessage.text}
              </Alert>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button icon="shield" loading={backupBusy} onClick={handleBackup}>
              Back up now
            </Button>
            <Button variant="secondary" icon="folder" loading={folderBusy} onClick={handleOpenFolder}>
              Open data folder
            </Button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            A backup is a consistent copy of the database, taken without stopping the API. Keep it in
            the backups folder or move it anywhere you like.
          </p>

          {backups.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Recent backups
              </h3>
              <ul className="mt-1 divide-y divide-slate-100">
                {backups.map((backup) => (
                  <li
                    key={backup.file}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="font-mono text-xs text-slate-700">{backup.file}</span>
                    <span className="text-xs text-slate-500">
                      {formatSize(backup.size)} · {formatDateTime(backup.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
                : pluralize(stored, "saved message") + " in this browser."}
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
