const { exec } = require("child_process");
const screenshot = require("screenshot-desktop");
const path = require("path");

exports.launchWebsite = async (url) => {
  const open = (await import("open")).default;

  console.log("SERVICE CALLED:", url);

  await open(url);

  console.log("OPEN FINISHED");
};

exports.launchApp = async (app) => {
  switch (app.toLowerCase()) {
    case "chrome":
      exec('open -a "Google Chrome"');
      break;
    case "vscode":
      exec('open -a "Visual Studio Code"');
      break;
    case "calculator":
      exec('open -a "Calculator"');
      break;
    default:
      throw new Error(`Unsupported app: ${app}`);
  }
};

exports.takeScreenshot = async () => {
  const fileName = `screenshot-${Date.now()}.png`;

  const filePath = path.join(
    __dirname,
    "../../screenshots",
    fileName
  );

  await screenshot({
    filename: filePath,
  });

  return fileName;
};