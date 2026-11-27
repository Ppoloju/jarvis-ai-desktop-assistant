import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ChatBox from "../../components/Chat/ChatBox";
import SystemInfo from "../../components/SystemInfo";
import { Alert, Card, PageHeader } from "../../components/ui";
import { Icon } from "../../components/ui/Icons";
import { getLaptopFolders, getReminders, listFiles } from "../../services/api";
import { formatSize } from "../../utils/format";

const FOLDER_ICONS = { desktop: "computer", documents: "file", downloads: "folder" };

const SHORTCUTS = [
  { to: "/automation", icon: "bolt", label: "Automation" },
  { to: "/computer", icon: "computer", label: "Computer" },
  { to: "/files", icon: "folder", label: "Storage" },
  { to: "/history", icon: "history", label: "History" },
];

const ViewAll = ({ to, label = "View all" }) => (
  <Link
    to={to}
    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-600 transition hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
  >
    {label}
    <Icon name="arrow" className="h-3.5 w-3.5" />
  </Link>
);

const SkeletonRows = () => (
  <div className="space-y-2.5" aria-hidden="true">
    {[0, 1, 2].map((key) => (
      <div key={key} className="h-9 animate-pulse rounded-lg bg-slate-100" />
    ))}
  </div>
);

export default function Home() {
  const [folders, setFolders] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [files, setFiles] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.allSettled([getLaptopFolders(), getReminders(), listFiles()]).then(
      ([folderResult, reminderResult, fileResult]) => {
        if (!active) {
          return;
        }

        const results = [folderResult, reminderResult, fileResult];

        if (results.every((result) => result.status === "rejected")) {
          setError(folderResult.reason?.message || "Could not reach the local API");
        }

        setFolders(folderResult.status === "fulfilled" ? folderResult.value.folders : []);
        setReminders(
          reminderResult.status === "fulfilled" ? reminderResult.value.reminders : []
        );
        setFiles(fileResult.status === "fulfilled" ? fileResult.value.entries : []);
      }
    );

    return () => {
      active = false;
    };
  }, []);

  const openReminders = (reminders || []).filter((reminder) => !reminder.completed);
  const recentFiles = (files || []).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Speak or type a command, then see what is happening across your computer."
      />

      <div className="space-y-6">
        <ChatBox />

        <SystemInfo />

        {error && (
          <Alert tone="error" onDismiss={() => setError("")}>
            Some dashboard data is unavailable: {error}
          </Alert>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          <Card title="Your folders" description="Read-only view" action={<ViewAll to="/computer" />}>
            {folders ? (
              <ul className="divide-y divide-slate-100">
                {folders.map((folder) => (
                  <li
                    key={folder.key}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Icon name={FOLDER_ICONS[folder.key] ?? "folder"} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">
                        {folder.label}
                      </span>
                      <span
                        className="block truncate text-xs text-slate-500"
                        title={folder.exists ? folder.path : undefined}
                      >
                        {folder.exists ? folder.path : "Not found on this computer"}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
                      {folder.exists ? (folder.count ?? 0) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <SkeletonRows />
            )}
          </Card>

          <Card
            title="Reminders"
            description={reminders ? `${openReminders.length} open` : "Loading"}
            action={<ViewAll to="/reminders" label="Manage" />}
          >
            {reminders ? (
              <>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-semibold tabular-nums text-slate-900">
                    {openReminders.length}
                  </span>
                  <span className="pb-1 text-sm text-slate-500">
                    open of {reminders.length}
                  </span>
                </div>

                {openReminders.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {openReminders.slice(0, 3).map((reminder) => (
                      <li key={reminder.id} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                        <span className="min-w-0 truncate">{reminder.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    All caught up. Say &ldquo;remind me to &hellip;&rdquo; in the box above.
                  </p>
                )}
              </>
            ) : (
              <SkeletonRows />
            )}
          </Card>

          <Card
            title="Recent storage"
            description="Scratch files kept by Orbit"
            action={<ViewAll to="/files" />}
          >
            {files ? (
              recentFiles.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {recentFiles.map((entry) => (
                    <li
                      key={entry.name}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Icon
                          name={entry.type === "folder" ? "folder" : "file"}
                          className="h-4 w-4"
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                        {entry.name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500">
                        {entry.type === "folder" ? "Folder" : formatSize(entry.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 py-6 text-center">
                  <Icon name="file" className="h-5 w-5 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">Nothing stored yet</p>
                  <p className="text-xs text-slate-500">Create a note from the Files page.</p>
                </div>
              )
            ) : (
              <SkeletonRows />
            )}
          </Card>
        </div>

        <nav aria-label="Shortcuts" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SHORTCUTS.map((shortcut) => (
            <Link
              key={shortcut.to}
              to={shortcut.to}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                <Icon name={shortcut.icon} className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-slate-800">{shortcut.label}</span>
              <Icon
                name="arrow"
                className="ml-auto h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500"
              />
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
