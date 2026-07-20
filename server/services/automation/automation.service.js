import { exec } from "child_process";
import screenshot from "screenshot-desktop";
import path from "path";
import open from "open";

export const launchWebsite = async (url) => {
  console.log("SERVICE CALLED:", url);

  await open(url);

  console.log("OPEN FINISHED");
};

export const launchApp = async (app) => {
  switch (app.toLowerCase()) {
    case "chrome":
      exec('start chrome');
      break;
    case "vscode":
      exec('code');
      break;
    case "calculator":
      exec('calc');
      break;
    default:
      throw new Error(`Unsupported app: ${app}`);
  }
};

export const takeScreenshot = async () => {
  const fileName = `screenshot-${Date.now()}.png`;

  const filePath = path.join(
    import.meta.dirname,
    "../../screenshots",
    fileName
  );

  await screenshot({
    filename: filePath,
  });

  return fileName;
};