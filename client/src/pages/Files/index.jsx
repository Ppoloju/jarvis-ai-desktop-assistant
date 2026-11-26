import { useCallback, useEffect, useState } from "react";
import {
  listFiles,
  readStoredFile,
  createFolder,
  createFile,
  renameFile,
  deleteFile,
} from "../../services/api";
import {
  Alert,
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  Input,
  PageHeader,
  Textarea,
} from "../../components/ui";
import { Icon } from "../../components/ui/Icons";
import { formatDateTime, formatSize, pluralize } from "../../utils/format";

export default function Files() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState("");
  const [folderName, setFolderName] = useState("");
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [oldName, setOldName] = useState("");
  const [newName, setNewName] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState("");

  const load = useCallback(async () => {
    const data = await listFiles();
    setEntries(data.entries);
  }, []);

  useEffect(() => {
    let active = true;

    listFiles()
      .then((data) => {
        if (active) setEntries(data.entries);
      })
      .catch((error) => {
        if (active) setStatus({ tone: "error", text: error.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    setStatus(null);

    try {
      await load();
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
    } finally {
      setRefreshing(false);
    }
  };

  const run = async (key, action, successText) => {
    setBusy(key);
    setStatus(null);

    try {
      await action();
      setStatus({ tone: "success", text: successText });
      await load();
      return true;
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
      return false;
    } finally {
      setBusy("");
    }
  };

  const handlePreview = async (entry) => {
    setPreviewing(entry.name);
    setStatus(null);

    try {
      const data = await readStoredFile(entry.name);
      setPreview(data.file);
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
    } finally {
      setPreviewing("");
    }
  };

  const handleFolder = async (event) => {
    event.preventDefault();

    if (await run("folder", () => createFolder(folderName), `Created folder ${folderName}`)) {
      setFolderName("");
    }
  };

  const handleFile = async (event) => {
    event.preventDefault();

    if (await run("file", () => createFile(fileName, content), `Created file ${fileName}`)) {
      setFileName("");
      setContent("");
    }
  };

  const handleRename = async (event) => {
    event.preventDefault();

    if (await run("rename", () => renameFile(oldName, newName), `Renamed ${oldName}`)) {
      setOldName("");
      setNewName("");
    }
  };

  return (
    <>
      <PageHeader
        title="Files"
        description="A sandboxed workspace for scratch text files. Items here live in the app's own storage folder, not in your Desktop, Documents or Downloads."
        action={
          <Button
            variant="secondary"
            icon="refresh"
            onClick={refresh}
            loading={refreshing}
            aria-label="Refresh stored items"
          >
            Refresh
          </Button>
        }
      />

      {status && (
        <div className="mb-5">
          <Alert tone={status.tone} onDismiss={() => setStatus(null)}>
            {status.text}
          </Alert>
        </div>
      )}

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card title="New folder">
          <form onSubmit={handleFolder} className="flex h-full flex-col gap-3">
            <Input
              aria-label="New folder name"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="documents"
              disabled={busy !== ""}
            />
            <Button
              type="submit"
              icon="plus"
              variant="secondary"
              loading={busy === "folder"}
              disabled={busy !== "" || !folderName.trim()}
              className="mt-auto w-full"
            >
              Create folder
            </Button>
          </form>
        </Card>

        <Card title="New file">
          <form onSubmit={handleFile} className="flex h-full flex-col gap-3">
            <Input
              aria-label="New file name"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="notes/todo.txt"
              disabled={busy !== ""}
            />
            <Textarea
              aria-label="File contents"
              rows={2}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Optional contents"
              disabled={busy !== ""}
            />
            <Button
              type="submit"
              icon="plus"
              variant="secondary"
              loading={busy === "file"}
              disabled={busy !== "" || !fileName.trim()}
              className="mt-auto w-full"
            >
              Create file
            </Button>
          </form>
        </Card>

        <Card title="Rename">
          <form onSubmit={handleRename} className="flex h-full flex-col gap-3">
            <Input
              aria-label="Current name"
              value={oldName}
              onChange={(event) => setOldName(event.target.value)}
              placeholder="Current name"
              disabled={busy !== ""}
            />
            <Input
              aria-label="New name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="New name"
              disabled={busy !== ""}
            />
            <Button
              type="submit"
              icon="refresh"
              variant="secondary"
              loading={busy === "rename"}
              disabled={busy !== "" || !oldName.trim() || !newName.trim()}
              className="mt-auto w-full"
            >
              Rename item
            </Button>
          </form>
        </Card>
      </div>

      <Card title="Storage" description={pluralize(entries.length, "item")}>
        {loading ? (
          <div className="space-y-2 py-2" aria-live="polite">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
            <span className="sr-only">Loading storage</span>
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon="folder"
            title="Nothing stored yet"
            description="Create a folder or file above and it will appear here."
          />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Stored items">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Type</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Modified</th>
                  <th className="px-5 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.name} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-slate-800">
                        <Icon
                          name={entry.type === "folder" ? "folder" : "file"}
                          className={`h-4 w-4 shrink-0 ${
                            entry.type === "folder" ? "text-amber-500" : "text-indigo-500"
                          }`}
                        />
                        <span className="truncate" title={entry.name}>
                          {entry.name}
                        </span>
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 capitalize text-slate-500 sm:table-cell">
                      {entry.type}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-slate-500">
                      {formatSize(entry.size)}
                    </td>
                    <td className="hidden px-3 py-3 text-slate-500 md:table-cell">
                      {formatDateTime(entry.modified)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {entry.type === "file" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="file"
                            loading={previewing === entry.name}
                            disabled={busy !== ""}
                            aria-label={`Preview ${entry.name}`}
                            onClick={() => handlePreview(entry)}
                          >
                            View
                          </Button>
                        )}
                        <ConfirmButton
                          aria-label={`Delete ${entry.name}`}
                          disabled={busy !== ""}
                          onConfirm={async () => {
                            const deleted = await run(
                              "delete",
                              () => deleteFile(entry.name),
                              `Deleted ${entry.name}`
                            );

                            if (deleted && preview?.name === entry.name) setPreview(null);
                          }}
                        >
                          Delete
                        </ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {preview && (
        <Card
          className="mt-5"
          title={preview.name}
          description={`${formatSize(preview.size)} · modified ${formatDateTime(preview.modified)}`}
          action={
            <Button variant="ghost" size="sm" icon="close" onClick={() => setPreview(null)}>
              Close
            </Button>
          }
        >
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
            {preview.content || "(This file is empty.)"}
          </pre>
          <p className="mt-2 text-xs text-slate-500">
            Text preview only. Files up to 256 KB can be shown here.
          </p>
        </Card>
      )}
    </>
  );
}
