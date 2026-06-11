exports.launchWebsite = async (url) => {
  const open = (await import("open")).default;

  console.log("SERVICE CALLED:", url);

  await open(url);

  console.log("OPEN FINISHED");
};
const { exec } = require("child_process");

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