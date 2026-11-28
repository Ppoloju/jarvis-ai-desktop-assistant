import { execFile } from "child_process";
import path from "path";

const windowsScript = path.join(
  import.meta.dirname,
  "../../utils/notify-windows.ps1"
);

const escapeAppleScript = (value) => String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

let warned = false;

const command = (title, body) => {
  if (process.platform === "win32") {
    return [
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        windowsScript,
        title,
        body,
      ],
    ];
  }

  if (process.platform === "darwin") {
    const script = `display notification "${escapeAppleScript(body)}" with title "${escapeAppleScript(title)}"`;

    return ["osascript", ["-e", script]];
  }

  return ["notify-send", [title, body]];
};

// Shows a desktop notification and returns immediately. Failures are logged once
// because a missing notification helper should never break the reminder itself.
export const notify = (title, body) => {
  if (process.env.ORBIT_NO_NOTIFY === "1") {
    return;
  }

  const [file, args] = command(String(title), String(body));

  try {
    const child = execFile(file, args, { windowsHide: true, timeout: 20_000 }, (error) => {
      if (error && !warned) {
        warned = true;
        console.warn(`Desktop notifications are unavailable: ${error.message}`);
      }
    });

    child.unref();
  } catch (error) {
    console.warn(`Desktop notifications are unavailable: ${error.message}`);
  }
};
