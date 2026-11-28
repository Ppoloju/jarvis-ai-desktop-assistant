import { getSystemInfo } from "./system.service.js";

// A small, read-only view of the machine for troubleshooting. Orbit reports
// what it can measure and suggests safe steps; it never changes settings or
// deletes files to "fix" something on its own.
const GB = 1024 ** 3;
const LOW_MEMORY_RATIO = 0.1;
const LOW_DISK_RATIO = 0.1;
const LOW_BATTERY = 20;
const LONG_UPTIME_SECONDS = 7 * 86_400;

const PLATFORM_NAMES = { win32: "Windows", darwin: "macOS", linux: "Linux" };

const gb = (bytes) => `${(bytes / GB).toFixed(1)} GB`;

const platformName = (info) =>
  `${PLATFORM_NAMES[info.platform] ?? info.platform}${info.release ? ` ${info.release}` : ""}`;

const formatUptime = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return "unknown";
  }

  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const plural = (value, word) => `${value} ${word}${value === 1 ? "" : "s"}`;

  if (days > 0) return `${plural(days, "day")}, ${plural(hours, "hour")}`;
  if (hours > 0) return `${plural(hours, "hour")}, ${plural(minutes, "minute")}`;

  return plural(minutes, "minute");
};

export const assess = (info) => {
  const issues = [];

  if (info.totalMemoryBytes > 0 && info.freeMemoryBytes / info.totalMemoryBytes < LOW_MEMORY_RATIO) {
    issues.push({
      title: "Memory is nearly full",
      detail: `${gb(info.freeMemoryBytes)} free of ${gb(info.totalMemoryBytes)}`,
      steps: [
        "Close apps and browser tabs you are not using, then try again.",
        "Restart if it stays slow; that clears leftover processes.",
      ],
    });
  }

  if (
    info.disk &&
    info.disk.totalBytes > 0 &&
    info.disk.freeBytes / info.disk.totalBytes < LOW_DISK_RATIO
  ) {
    issues.push({
      title: "Disk space is low",
      detail: `${gb(info.disk.freeBytes)} free of ${gb(info.disk.totalBytes)}`,
      steps: [
        "Empty the Recycle Bin or Trash and clear old downloads.",
        "Uninstall unused apps, or move large files to another drive.",
      ],
    });
  }

  if (info.uptimeSeconds >= LONG_UPTIME_SECONDS) {
    issues.push({
      title: "The computer has been running for a while",
      detail: formatUptime(info.uptimeSeconds),
      steps: ["Restart when convenient so pending updates can finish."],
    });
  }

  if (info.battery?.available && !info.battery.pluggedIn && info.battery.percentage < LOW_BATTERY) {
    issues.push({
      title: "Battery is low",
      detail: `${info.battery.percentage}%`,
      steps: ["Plug in the charger before doing anything heavy."],
    });
  }

  return issues;
};

const describe = (info) => {
  const lines = [
    `- OS: ${platformName(info)} (${info.arch ?? "unknown"})`,
    `- CPU cores: ${info.cpuCount}`,
    `- Memory: ${gb(info.freeMemoryBytes)} free of ${gb(info.totalMemoryBytes)}`,
  ];

  if (info.disk) {
    lines.push(`- Disk: ${gb(info.disk.freeBytes)} free of ${gb(info.disk.totalBytes)}`);
  }

  lines.push(`- Uptime: ${formatUptime(info.uptimeSeconds)}`);

  if (info.battery?.available) {
    lines.push(
      `- Battery: ${info.battery.percentage}%${info.battery.pluggedIn ? " (plugged in)" : ""}`
    );
  }

  return lines.join("\n");
};

export const getDiagnosis = async () => {
  const info = await getSystemInfo();

  return { info, issues: assess(info) };
};

export const formatReport = ({ info, issues }) => {
  const parts = ["Here is what I can see on this computer:", describe(info)];

  if (issues.length === 0) {
    parts.push(
      "Memory, disk, uptime and battery look fine, so the cause is probably a specific app, driver or update."
    );
  } else {
    parts.push(
      "Things worth fixing first:\n" +
        issues
          .map(
            (issue, index) =>
              `${index + 1}. ${issue.title} (${issue.detail})\n   ${issue.steps.join(" ")}`
          )
          .join("\n")
    );
  }

  parts.push(
    "I can only read these details. I cannot change settings or repair the system myself, so tell me what you see and I can help with the next step."
  );

  return parts.join("\n\n");
};

export const modelContext = (info) =>
  [
    "Device snapshot from this computer, collected just now. Use these facts; do not invent more:",
    describe(info),
    "You cannot change settings, install drivers or repair the system; say what you cannot do and give short, safe steps.",
  ].join("\n");
