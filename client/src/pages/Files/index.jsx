import { useCallback, useEffect, useState } from "react";
import {
  listFiles,
  createFolder,
  createFile,
  renameFile,
  deleteFile,
} from "../../services/api";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Textarea,
} from "../../components/ui";
import { Icon } from "../../components/ui/Icons";

const formatSize = (bytes) => {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function Files() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState("");
  const [folderName, setFolderName] = useState("");
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [oldName, setOldName] = useState("");
  const [newName, setNewName] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await listFiles();
      setEntries(data.entries);
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
    } finally {
      setLoading(false);
    }
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

  const run = async (key, action, successText) => {
    setBusy(key);
    setStatus(null);

    try {
      await action();
      setStatus({ tone: "success", text: successText });
      await refresh();
      return true;
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
      return false;
    } finally {
      setBusy("");
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
        description="Create, rename and remove items in the assistant's storage folder."
        action={
          <Button variant="secondary" icon="refresh" onClick={refresh} loading={loading}>
            Refresh
          </Button>
        }
      />

      {status && (
        <div className="mb-5">
          <Alert tone={status.tone}>{status.text}</Alert>
        </div>
      )}

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card title="New folder">
          <form onSubmit={handleFolder} className="space-y-3">
            <Input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="documents"
            />
            <Button
              type="submit"
              icon="plus"
              variant="secondary"
              loading={busy === "folder"}
              disabled={busy !== "" || !folderName.trim()}
              className="w-full"
            >
              Create folder
            </Button>
          </form>
        </Card>

        <Card title="New file">
          <form onSubmit={handleFile} className="space-y-3">
            <Input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="notes/todo.txt"
            />
            <Textarea
              rows={2}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Optional contents"
            />
            <Button
              type="submit"
              icon="plus"
              variant="secondary"
              loading={busy === "file"}
              disabled={busy !== "" || !fileName.trim()}
              className="w-full"
            >
              Create file
            </Button>
          </form>
        </Card>

        <Card title="Rename">
          <form onSubmit={handleRename} className="space-y-3">
            <Input
              value={oldName}
              onChange={(event) => setOldName(event.target.value)}
              placeholder="Current name"
            />
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="New name"
            />
            <Button
              type="submit"
              icon="refresh"
              variant="secondary"
              loading={busy === "rename"}
              disabled={busy !== "" || !oldName.trim() || !newName.trim()}
              className="w-full"
            >
              Rename item
            </Button>
          </form>
        </Card>
      </div>

      <Card title="Storage" description={`${entries.length} item(s)`}>
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading storage...</p>
        ) : entries.length === 0 ? (
          <EmptyState
            icon="folder"
            title="Nothing stored yet"
            description="Create a folder or file above and it will appear here."
          />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium">Modified</th>
                  <th className="px-5 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.name} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2 font-medium text-slate-800">
                        <Icon
                          name={entry.type === "folder" ? "folder" : "file"}
                          className="h-4 w-4 text-slate-400"
                        />
                        {entry.name}
                      </span>
                    </td>
                    <td className="px-3 py-3 capitalize text-slate-500">{entry.type}</td>
                    <td className="px-3 py-3 text-slate-500">{formatSize(entry.size)}</td>
                    <td className="px-3 py-3 text-slate-500">{formatDate(entry.modified)}</td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="trash"
                        className="text-red-600 hover:bg-red-50"
                        disabled={busy !== ""}
                        onClick={() =>
                          run("delete", () => deleteFile(entry.name), `Deleted ${entry.name}`)
                        }
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
