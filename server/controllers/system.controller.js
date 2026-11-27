import * as systemService from "../services/system/system.service.js";

export const getSystemInfo = async (req, res) => {
  const info = await systemService.getSystemInfo();

  res.json(info);
};
