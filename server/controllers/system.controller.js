import * as systemService from "../services/system/system.service.js";

export const getSystemInfo = (req, res) => {
  const info = systemService.getSystemInfo();

  res.json(info);
};