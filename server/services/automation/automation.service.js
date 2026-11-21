import { exec } from "child_process";
import fs from "fs";
import screenshot from "screenshot-desktop";
import path from "path";
import open from "open";

const screenshotsDir = path.join(import.meta.dirname, "../../screenshots");

export const launchWebsite = async (url) => {
  if (!url) {
    throw new Error("A url is required");
  }

  await open(url);
};

export const launchApp = async (app) => {
  if (!app) {
    throw new Error("An app name is required");
  }

  const isWindows = process.platform === "win32";

  switch (app.toLowerCase()) {
    case "chrome":
      exec(isWindows ? "start chrome" : "open -a 'Google Chrome'");
      break;
    case "vscode":
      exec("code");
      break;
    case "calculator":
      exec(isWindows ? "calc" : "open -a Calculator");
      break;
    default:
      throw new Error(`Unsupported app: ${app}`);
  }
};

export const takeScreenshot = async () => {
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const fileName = `screenshot-${Date.now()}.png`;

  await screenshot({
    filename: path.join(screenshotsDir, fileName),
  });

  return fileName;
};
