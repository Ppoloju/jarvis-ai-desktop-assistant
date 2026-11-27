import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const BATTERY_CACHE_MS = 30_000;
const PROBE_TIMEOUT_MS = 3_000;
const LINUX_POWER_SUPPLY = "/sys/class/power_supply";

let batteryCache = { value: null, at: 0 };

const bytesToGB = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(2);

const run = (command, args) =>
  new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { timeout: PROBE_TIMEOUT_MS, windowsHide: true },
      (error, stdout) => (error ? reject(error) : resolve(String(stdout)))
    );
  });

// Win32_Battery.BatteryStatus: 1 discharging, 2 on AC, 6-9 charging.
const readWindowsBattery = async () => {
  const stdout = await run("powershell", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "Get-CimInstance -ClassName Win32_Battery | Select-Object -First 1 EstimatedChargeRemaining,BatteryStatus | ConvertTo-Json -Compress",
  ]);

  if (!stdout.trim()) {
    return { available: false };
  }

  const info = JSON.parse(stdout);
  const percentage = Number(info.EstimatedChargeRemaining);

  if (!Number.isFinite(percentage)) {
    return { available: false };
  }

  const status = Number(info.BatteryStatus);
  const charging = status >= 6 && status <= 9;

  return {
    available: true,
    percentage: Math.round(percentage),
    charging,
    pluggedIn: charging || status === 2,
  };
};

// pmset prints e.g. "98%; charging; 1:12 remaining present: true".
const readMacBattery = async () => {
  const stdout = await run("pmset", ["-g", "batt"]);
  const match = stdout.match(/(\d{1,3})%/);

  if (!match) {
    return { available: false };
  }

  const charging = /;\s*(charging|finishing charge)/i.test(stdout);

  return {
    available: true,
    percentage: Math.round(Number(match[1])),
    charging,
    pluggedIn: charging || /AC (attached|Power)/i.test(stdout),
  };
};

const readLinuxBattery = () => {
  let names;

  try {
    names = fs
      .readdirSync(LINUX_POWER_SUPPLY)
      .filter((name) => name.startsWith("BAT") || name === "battery");
  } catch {
    return { available: false };
  }

  for (const name of names) {
    try {
      const base = path.join(LINUX_POWER_SUPPLY, name);
      const percentage = Number(fs.readFileSync(path.join(base, "capacity"), "utf8").trim());

      if (!Number.isFinite(percentage)) {
        continue;
      }

      const status = fs.readFileSync(path.join(base, "status"), "utf8").trim().toLowerCase();

      return {
        available: true,
        percentage: Math.round(percentage),
        charging: status === "charging",
        pluggedIn: ["charging", "full", "not charging"].includes(status),
      };
    } catch {
      // Try the next power supply entry
    }
  }

  return { available: false };
};

const readBattery = () => {
  const platform = os.platform();

  if (platform === "win32") return readWindowsBattery();
  if (platform === "darwin") return readMacBattery();
  if (platform === "linux") return Promise.resolve(readLinuxBattery());

  return Promise.resolve({ available: false });
};

// Probing spawns a process on Windows, so the result is cached for a short while.
export const getBattery = async () => {
  const now = Date.now();

  if (batteryCache.value && now - batteryCache.at < BATTERY_CACHE_MS) {
    return batteryCache.value;
  }

  let value;

  try {
    value = await readBattery();
  } catch {
    // A missing tool or unexpected output shape is not an error for the dashboard
    value = { available: false };
  }

  batteryCache = { value, at: now };

  return value;
};

export const getSystemInfo = async () => ({
  platform: os.platform(),
  cpuCount: os.cpus().length,
  totalMemory: `${bytesToGB(os.totalmem())} GB`,
  freeMemory: `${bytesToGB(os.freemem())} GB`,
  uptime: `${Math.floor(os.uptime() / 60)} minutes`,
  battery: await getBattery(),
});
