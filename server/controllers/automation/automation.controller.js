const automationService = require("../../services/automation/automation.service");

exports.openWebsite = async (req, res) => {
   

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