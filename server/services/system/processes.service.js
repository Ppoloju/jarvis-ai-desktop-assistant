import { execFile } from "child_process";
import os from "os";

// Read-only process introspection for "what is running" and "what is using my
// memory" questions. Nothing here stops, starts or changes a process.
const TIMEOUT_MS = 4_000;
const TOP_COUNT = 8;
const MODEL_COUNT = 5;
const MAX_BUFFER = 2 * 1024 * 1024;
const MAX_NAME_LENGTH = 60;

const GB = 1024 ** 3;
const MB = 1024 ** 2;

const run = (command, args) =>
  new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { timeout: TIMEOUT_MS, windowsHide: true, maxBuffer: MAX_BUFFER },
      (error, stdout) => (error ? reject(error) : resolve(String(stdout)))
    );
  });

const cleanName = (value) => String(value ?? "unknown").trim().slice(0, MAX_NAME_LENGTH);

// Many desktop apps run several helper processes; group them under one name so
// the list reads like the user's apps rather than an alphabet of helpers.
export const groupProcesses = (rows) => {
  const groups = new Map();

  rows.forEach((row) => {
    const key = row.name;
    const entry = groups.get(key) ?? {
      name: key,
      count: 0,
      memoryBytes: 0,
      cpuPercent: null,
    };

    entry.count += 1;
    entry.memoryBytes += Number(row.memoryBytes) || 0;

    if (Number.isFinite(row.cpuPercent)) {
      entry.cpuPercent = (entry.cpuPercent ?? 0) + row.cpuPercent;
    }

    groups.set(key, entry);
  });

  return [...groups.values()].sort((a, b) => b.memoryBytes - a.memoryBytes);
};

// Get-Process | Select-Object Name,WorkingSet64 | ConvertTo-Json -Compress
export const parseWindows = (stdout) => {
  const parsed = JSON.parse(stdout || "[]");
  const rows = Array.isArray(parsed) ? parsed : [parsed];

  return groupProcesses(
    rows.map((row) => ({
      name: cleanName(row?.Name),
      memoryBytes: Number(row?.WorkingSet64) || 0,
      cpuPercent: null,
    }))
  );
};

// ps -eo pid=,pcpu=,rss=,comm=  (rss is in kilobytes, comm may contain spaces)
export const parsePs = (stdout) => {
  const rows = stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const match = line.trim().match(/^(\d+)\s+([\d.]+)\s+(\d+)\s+(.+)$/);

      if (!match) {
        return null;
      }

      return {
        name: cleanName(match[4]),
        cpuPercent: Number(match[2]),
        memoryBytes: Number(match[3]) * 1024,
      };
    })
    .filter(Boolean);

  return groupProcesses(rows);
};

const readAll = async () => {
  if (os.platform() === "win32") {
    const stdout = await run("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Get-Process | Select-Object Name,WorkingSet64 | ConvertTo-Json -Compress",
    ]);

    return parseWindows(stdout);
  }

  return parsePs(await run("ps", ["-eo", "pid=,pcpu=,rss=,comm="]));
};

// System-wide CPU load from two samples of the kernel counters, which works the
// same on every platform (unlike os.loadavg, which is zero on Windows).
export const readCpuUsage = async (sampleMs = 200) => {
  const snapshot = () => os.cpus().map((cpu) => ({ ...cpu.times }));
  const before = snapshot();

  await new Promise((resolve) => setTimeout(resolve, sampleMs));

  const after = snapshot();
  let idle = 0;
  let total = 0;

  after.forEach((times, index) => {
    const previous = before[index];

    if (!previous) return;

    Object.keys(times).forEach((key) => {
      const delta = (times[key] ?? 0) - (previous[key] ?? 0);

      total += delta;

      if (key === "idle") {
        idle += delta;
      }
    });
  });

  return total > 0 ? Math.round((1 - idle / total) * 100) : null;
};

const formatMemory = (bytes) =>
  bytes >= GB ? `${(bytes / GB).toFixed(1)} GB` : `${Math.round(bytes / MB)} MB`;

export const listProcesses = async () => {
  const all = await readAll();
  const total = all.reduce((sum, item) => sum + item.count, 0);

  return { total, items: all.slice(0, TOP_COUNT) };
};

const processLine = (item) => {
  const count = item.count > 1 ? ` (${item.count} processes)` : "";
  const cpu = Number.isFinite(item.cpuPercent) ? `, ${item.cpuPercent.toFixed(1)}% CPU` : "";

  return `- ${item.name}${count}: ${formatMemory(item.memoryBytes)}${cpu}`;
};

export const formatReport = ({ info, usage, list }) => {
  const used = info.totalMemoryBytes - info.freeMemoryBytes;
  const usedPercent =
    info.totalMemoryBytes > 0 ? Math.round((used / info.totalMemoryBytes) * 100) : 0;
  const lines = [
    `CPU usage: ${usage === null ? "unknown" : `${usage}%`} across ${info.cpuCount} cores`,
    `Memory: ${formatMemory(info.freeMemoryBytes)} free of ${formatMemory(info.totalMemoryBytes)} (${usedPercent}% in use)`,
    `Processes: ${list.total} running. Top ${list.items.length} by memory:`,
    ...list.items.map(processLine),
    "",
    "I can only read this. I do not stop, start or change processes.",
  ];

  return lines.join("\n");
};

export const formatForModel = ({ total, items }) =>
  [
    `Running processes on this computer (top ${Math.min(items.length, MODEL_COUNT)} of ${total} by memory):`,
    ...items.slice(0, MODEL_COUNT).map((item) => `- ${item.name}: ${formatMemory(item.memoryBytes)}`),
  ].join("\n");
