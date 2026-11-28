import express from "express";
import fs from "fs";
import cors from "cors";
import path from "path";
import logger from "./middlewares/logger.js";
import errorHandler from "./middlewares/errorHandler.js";
import { securityHeaders, rejectForeignHosts } from "./middlewares/security.js";
import fileRoutes from "./routes/files/files.routes.js";
import laptopRoutes from "./routes/laptop/laptop.routes.js";
import automationRoutes from "./routes/automation/automation.routes.js";
import systemRoutes from "./routes/system.routes.js";
import reminderRoutes from "./routes/reminders/reminders.routes.js";
import * as assistant from "./services/assistant/assistant.service.js";
import { assert } from "./utils/http.js";

const app = express();

app.disable("x-powered-by");
const dataDir = process.env.ORBIT_DATA_DIR || import.meta.dirname;
const screenshotsDir = path.join(dataDir, "screenshots");

const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error(`Origin not allowed: ${origin}`);
    error.status = 403;
    callback(error);
  },
};

app.use(securityHeaders);
app.use(rejectForeignHosts);
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(logger);

app.use(
  "/screenshots",
  express.static(screenshotsDir)
);

app.use("/api/automation", automationRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/laptop", laptopRoutes);
app.use("/api/reminders", reminderRoutes);

app.get("/", (req, res) => {
  res.type("text/plain").send("Orbit API is running.");
});

app.post("/api/chat", async (req, res) => {
  const message = req.body?.message;

  assert(typeof message === "string" && message.trim(), 400, "A message is required");
  assert(message.length <= 2000, 413, "That message is too long (2000 characters at most)");

  res.json(await assistant.reply(message));
});

app.delete("/api/chat/memory", (req, res) => {
  assistant.clearMemory();
  res.json({ success: true, cleared: true });
});

app.get("/api/health", async (req, res) => {
  let storageWritable = true;

  try {
    fs.accessSync(dataDir, fs.constants.W_OK);
  } catch {
    storageWritable = false;
  }

  res.json({
    success: true,
    status: storageWritable ? "ok" : "degraded",
    version: process.env.npm_package_version || "1.0.0",
    uptimeSeconds: Math.round(process.uptime()),
    storageWritable,
    ai: await assistant.aiStatus(),
  });
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    service: "orbit-api",
    endpoints: {
      health: "GET /api/health",
      chat: ["POST /api/chat", "DELETE /api/chat/memory"],
      automation: [
        "POST /api/automation/open-website",
        "POST /api/automation/open-app",
        "GET /api/automation/apps",
        "POST /api/automation/screenshot",
        "GET /api/automation/screenshots",
      ],
      system: [
        "GET /api/system/info",
        "GET /api/system/ai",
        "GET /api/system/backup",
        "POST /api/system/backup",
        "POST /api/system/open-data-folder",
      ],
      files: [
        "GET /api/files",
        "GET /api/files/content?name=...",
        "POST /api/files/create-folder",
        "POST /api/files/create-file",
        "PATCH /api/files/rename-file",
        "DELETE /api/files/delete-file",
      ],
      laptop: [
        "GET /api/laptop",
        "GET /api/laptop/search?q=... (read-only)",
        "GET /api/laptop/:folder?path=... (read-only)",
      ],
      reminders: [
        "GET /api/reminders",
        "POST /api/reminders",
        "PATCH /api/reminders/:id",
        "DELETE /api/reminders/:id",
      ],
    },
  });
});

// unknown route handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// error handler
app.use(errorHandler);

export default app;
