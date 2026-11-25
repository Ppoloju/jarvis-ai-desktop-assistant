import { useState } from "react";
import { openWebsite, openApp, captureScreenshot, assetUrl } from "../../services/api";
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
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState("");

  const run = async (key, action) => {
    setBusy(key);
    setStatus(null);

    try {
      const result = await action();
      setStatus({ tone: "success", text: result.message || "Done" });
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
    const result = await run("screenshot", captureScreenshot);

    if (result) {
      setScreenshot(result);
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
        </Card>
      </div>
    </>
  );
}
