import express from "express";
import cors from "cors";
import path from "path";
import logger from "./middlewares/logger.js";
import errorHandler from "./middlewares/errorHandler.js";
import fileRoutes from "./routes/files/files.routes.js";
import automationRoutes from "./routes/automation/automation.routes.js";
import systemRoutes from "./routes/system.routes.js";
import reminderRoutes from "./routes/reminders/reminders.routes.js";
import * as assistant from "./services/assistant/assistant.service.js";
import { assert } from "./utils/http.js";

const app = express();

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

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(logger);

app.use(
  "/screenshots",
  express.static(path.join(import.meta.dirname, "screenshots"))
);

app.use("/api/automation", automationRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/reminders", reminderRoutes);

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

app.post("/api/chat", async (req, res) => {
  const message = req.body?.message;

  assert(typeof message === "string" && message.trim(), 400, "A message is required");

  res.json(await assistant.reply(message));
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    service: "jarvis-api",
    endpoints: {
      system: "GET /api/system/info",
      chat: "POST /api/chat",
      automation: [
        "POST /api/automation/open-website",
        "POST /api/automation/open-app",
        "POST /api/automation/screenshot",
      ],
      files: [
        "GET /api/files",
        "POST /api/files/create-folder",
        "POST /api/files/create-file",
        "PATCH /api/files/rename-file",
        "DELETE /api/files/delete-file",
      ],
      reminders: [
        "GET /api/reminders",
        "POST /api/reminders",
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
