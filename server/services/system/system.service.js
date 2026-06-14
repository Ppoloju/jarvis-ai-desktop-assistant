const os = require("os");

exports.getSystemInfo = () => {
  const bytesToGB = (bytes) =>
    (bytes / (1024 * 1024 * 1024)).toFixed(2);

  return {
    platform: os.platform(),
    cpuCount: os.cpus().length,
    totalMemory: `${bytesToGB(os.totalmem())} GB`,
    freeMemory: `${bytesToGB(os.freemem())} GB`,
    uptime: `${Math.floor(os.uptime() / 60)} minutes`,
  };
};