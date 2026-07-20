import * as automationService from "../../services/automation/automation.service.js";

export const openWebsite = async (req, res) => {
  try {
    const { url } = req.body;

    await automationService.launchWebsite(url);

    res.json({
      success: true,
      message: `Opened ${url}`,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const openApp = async (req, res) => {
  try {
    const { app } = req.body;

    await automationService.launchApp(app);

    res.json({
      success: true,
      message: `Opened ${app}`,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const captureScreenshot = async (req, res) => {
  try {
    const fileName = await automationService.takeScreenshot();

    res.json({
      success: true,
      file: fileName,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};