import * as automationService from "../../services/automation/automation.service.js";

export const openWebsite = async (req, res) => {
  const { url } = req.body ?? {};

  const opened = await automationService.launchWebsite(url);

  res.json({
    success: true,
    message: `Opened ${opened}`,
  });
};

export const openApp = async (req, res) => {
  const { app } = req.body ?? {};

  await automationService.launchApp(app);

  res.json({
    success: true,
    message: `Opened ${app}`,
  });
};

export const captureScreenshot = async (req, res) => {
  const file = await automationService.takeScreenshot();

  res.json({
    success: true,
    file,
    url: `/screenshots/${encodeURIComponent(file)}`,
  });
};
