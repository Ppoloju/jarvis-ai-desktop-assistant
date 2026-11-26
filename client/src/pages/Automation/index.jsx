import { useEffect, useState } from "react";
import {
  openWebsite,
  openApp,
  captureScreenshot,
  listScreenshots,
  assetUrl,
} from "../../services/api";
import { Alert, Button, Card, Input, PageHeader } from "../../components/ui";
import { Icon } from "../../components/ui/Icons";

const APPS = [
  { name: "chrome", label: "Chrome", icon: "globe" },
  { name: "vscode", label: "VS Code", icon: "file" },
  { name: "calculator", label: "Calculator", icon: "app" },
];

export default function Automation() {
  const [url, setUrl] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let active = true;

    listScreenshots()
      .then((data) => {
        if (!active) return;

        setHistory(data.screenshots);

        if (data.screenshots.length > 0) {
          setScreenshot({ url: data.screenshots[0].url });
        }
      })
      .catch(() => {
        // The gallery is optional; the rest of the page still works
      });

    return () => {
      active = false;
    };
  }, []);

  const run = async (key, action, successText) => {
    setBusy(key);
    setStatus(null);

    try {
      const result = await action();
      setStatus({ tone: "success", text: successText || result.message || "Done" });
      return result;
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
      return null;
    } finally {
      setBusy("");
    }
  };

  const handleWebsite = async (event) => {
    event.preventDefault();

    if (await run("website", () => openWebsite(url))) {
      setUrl("");
    }
  };

  const handleScreenshot = async () => {
    const result = await run(
      "screenshot",
      captureScreenshot,
      "Screenshot saved to the screenshots folder"
    );

    if (result) {
      setScreenshot(result);
      setHistory((previous) =>
        [
          { file: result.file, url: result.url, createdAt: new Date().toISOString() },
          ...previous.filter((item) => item.file !== result.file),
        ].slice(0, 6)
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Automation"
        description="Launch websites and apps, or capture what is on your screen."
      />

      {status && (
        <div className="mb-5">
          <Alert tone={status.tone} onDismiss={() => setStatus(null)}>
            {status.text}
          </Alert>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Open a website" description="http and https addresses only">
          <form onSubmit={handleWebsite} className="space-y-3">
            <Input
              label="Address"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="google.com"
              inputMode="url"
              disabled={busy !== ""}
            />
            <Button
              type="submit"
              icon="globe"
              loading={busy === "website"}
              disabled={busy !== "" || !url.trim()}
              className="w-full"
            >
              Open website
            </Button>
          </form>
        </Card>

        <Card title="Launch an application" description="Starts an app on this computer">
          <div className="grid grid-cols-3 gap-2">
            {APPS.map((app) => (
              <button
                key={app.name}
                type="button"
                onClick={() => run(app.name, () => openApp(app.name))}
                disabled={busy !== ""}
                aria-label={`Launch ${app.label}`}
                className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 px-3 py-4 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name={app.icon} className="h-5 w-5" />
                {app.label}
              </button>
            ))}
          </div>
        </Card>

        <Card
          title="Capture screen"
          description="Saves a PNG to your screenshots folder"
          className="lg:col-span-2"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button
              icon="camera"
              onClick={handleScreenshot}
              loading={busy === "screenshot"}
              disabled={busy !== ""}
            >
              Take screenshot
            </Button>
            {screenshot && (
              <a
                href={assetUrl(screenshot.url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Open full size
                <Icon name="arrow" className="h-4 w-4" />
              </a>
            )}
          </div>

          {screenshot ? (
            <img
              src={assetUrl(screenshot.url)}
              alt="Captured desktop screenshot"
              loading="lazy"
              className="mt-4 w-full rounded-lg border border-slate-200 shadow-sm"
            />
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
              <Icon name="camera" className="h-5 w-5 text-slate-400" />
              <p className="text-sm text-slate-500">
                No screenshot captured yet. The latest capture will appear here.
              </p>
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Recent captures
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                {history.map((item) => (
                  <button
                    key={item.file}
                    type="button"
                    onClick={() => setScreenshot({ url: item.url })}
                    aria-label={`Show ${item.file}`}
                    className={`overflow-hidden rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      screenshot?.url === item.url
                        ? "border-indigo-400 ring-1 ring-indigo-400"
                        : "border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    <img
                      src={assetUrl(item.url)}
                      alt={item.file}
                      loading="lazy"
                      className="h-16 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                The newest 20 captures are kept; older ones are removed automatically.
              </p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
