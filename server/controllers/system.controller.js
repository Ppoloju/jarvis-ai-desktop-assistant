

const systemService = require("../services/system/system.service");

exports.getSystemInfo = (req, res) => {
  const info = systemService.getSystemInfo();

  res.json(info);
};