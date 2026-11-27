import { useEffect, useState } from "react";
import { getLaptopFolders, listLaptopFolder } from "../../services/api";
import { Alert, Button, Card, EmptyState, PageHeader } from "../../components/ui";
import { Icon } from "../../components/ui/Icons";
import { formatDateTime, formatSize, pluralize } from "../../utils/format";

export default function Computer() {
  const [folders, setFolders] = useState([]);
  const [active, setActive] = useState("");
  const [segments, setSegments] = useState([]);
  const [listing, setListing] = useState(null);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorKey, setErrorKey] = useState("");
  const [status, setStatus] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let ignore = false;

    getLaptopFolders()
      .then((data) => {
        if (ignore) return;

        setFolders(data.folders);

        const first = data.folders.find((folder) => folder.exists);

        if (first) setActive(first.key);
      })
      .catch((error) => {
        if (!ignore) setStatus({ tone: "error", text: error.message });
      })
      .finally(() => {
        if (!ignore) setLoadingFolders(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    let ignore = false;

    listLaptopFolder(active, segments.join("/"))
      .then((data) => {
        if (!ignore) setListing(data);
      })
      .catch((error) => {
        if (!ignore) {
          setListing(null);
          setErrorKey(`${active}:${segments.join("/")}`);
          setStatus({ tone: "error", text: error.message });
        }
      })
      .finally(() => {
        if (!ignore) {
          setRefreshing(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [active, segments, refreshToken]);

  const selectFolder = (key) => {
    setStatus(null);
    setErrorKey("");
    setSegments([]);
    setActive(key);
  };

  const currentPath = segments.join("/");
  const listingKey = listing ? `${listing.key}:${listing.segments.join("/")}` : "";
  const loading = Boolean(active) && listingKey !== `${active}:${currentPath}` && errorKey !== `${active}:${currentPath}`;
  const activeFolder = folders.find((folder) => folder.key === active);
  const pathLabel = listing?.path || activeFolder?.path || "";

  return (
    <>
      <PageHeader
        title="My computer"
        description="Look inside your Desktop, Documents and Downloads. This view is read-only: nothing here can be renamed, moved or deleted."
      />

      {status && (
        <div className="mb-5">
          <Alert tone={status.tone} onDismiss={() => setStatus(null)}>
            {status.text}
          </Alert>
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {loadingFolders
          ? [0, 1, 2].map((key) => (
              <div key={key} className="h-[74px] animate-pulse rounded-xl bg-slate-100" />
            ))
          : folders.map((folder) => {
              const isActive = folder.key === active;

              return (
                <button
                  key={folder.key}
                  type="button"
                  disabled={!folder.exists}
                  aria-pressed={isActive}
                  onClick={() => selectFolder(folder.key)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-50 ${
                    isActive
                      ? "border-indigo-300 bg-indigo-50/70 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon name="folder" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">
                      {folder.label}
                    </span>
                    <span className="block truncate text-xs text-slate-600">
                      {folder.exists
                        ? folder.count === null
                          ? "Ready"
                          : pluralize(folder.count, "item")
                        : "Not on this computer"}
                    </span>
                  </span>
                </button>
              );
            })}
      </div>

      <Card
        title={activeFolder ? activeFolder.label : "Folders"}
        description={pathLabel}
        action={
          <Button
            variant="secondary"
            icon="refresh"
            loading={refreshing}
            disabled={!active}
            onClick={() => {
              setStatus(null);
              setErrorKey("");
              setRefreshing(true);
              setRefreshToken((token) => token + 1);
            }}
          >
            Refresh
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            <Icon name="shield" className="h-3.5 w-3.5" />
            Read-only
          </span>

          {activeFolder && (
            <>
              <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setSegments([])}
                disabled={segments.length === 0}
                className="rounded px-1 py-0.5 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-default disabled:text-slate-900 disabled:hover:bg-transparent"
              >
                {activeFolder.label}
              </button>
              {segments.map((segment, index) => (
                <span key={`${segment}-${index}`} className="flex items-center gap-1.5">
                  <span className="text-slate-300" aria-hidden="true">
                    /
                  </span>
                  <button
                    type="button"
                    onClick={() => setSegments(segments.slice(0, index + 1))}
                    disabled={index === segments.length - 1}
                    className="max-w-[12rem] truncate rounded px-1 py-0.5 text-slate-600 transition hover:bg-slate-100 disabled:cursor-default disabled:font-medium disabled:text-slate-900 disabled:hover:bg-transparent"
                  >
                    {segment}
                  </button>
                </span>
              ))}
            </>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 py-2" aria-live="polite">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
            <span className="sr-only">Loading folder</span>
          </div>
        ) : !listing || listing.entries.length === 0 ? (
          <EmptyState
            icon="folder"
            title={active ? "This folder is empty" : "No folders found"}
            description={
              active
                ? "There is nothing to show here."
                : "Desktop, Documents and Downloads could not be found for this user."
            }
          />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label={`Contents of ${pathLabel}`}>
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Type</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Modified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listing.entries.map((entry) => (
                  <tr
                    key={entry.name}
                    className={entry.type === "folder" ? "transition hover:bg-slate-50" : ""}
                  >
                    <td className="px-5 py-3">
                      {entry.type === "folder" ? (
                        <button
                          type="button"
                          onClick={() => setSegments([...segments, entry.name])}
                          aria-label={`Open folder ${entry.name}`}
                          className="flex min-w-0 max-w-full items-center gap-2 rounded font-medium text-slate-800 transition hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <Icon name="folder" className="h-4 w-4 shrink-0 text-amber-500" />
                          <span className="truncate" title={entry.name}>
                            {entry.name}
                          </span>
                        </button>
                      ) : (
                        <span className="flex min-w-0 items-center gap-2 text-slate-700">
                          <Icon name="file" className="h-4 w-4 shrink-0 text-indigo-500" />
                          <span className="truncate" title={entry.name}>
                            {entry.name}
                          </span>
                        </span>
                      )}
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
                  </tr>
                ))}
              </tbody>
            </table>

            {listing.truncated && (
              <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                Only the first {listing.entries.length} entries are shown.
              </p>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
