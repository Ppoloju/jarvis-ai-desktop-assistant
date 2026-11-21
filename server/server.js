import "dotenv/config";
import express from "express";
import cors from "cors";
import logger from "./middlewares/logger.js";
import errorHandler from "./middlewares/errorHandler.js";
import fileRoutes from "./routes/files/files.routes.js";
import automationRoutes from "./routes/automation/automation.routes.js";
import systemRoutes from "./routes/system.routes.js";
import reminderRoutes from "./routes/reminders/reminders.routes.js";

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(logger);

app.use("/api/automation", automationRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/reminders", reminderRoutes);

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// chat route (basic example for now)
app.post("/api/chat", (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ reply: "No message received" });
  }

  // simple AI-like response (you can replace later with real AI)
  const botReply = `You said: ${userMessage}`;

  res.json({ reply: botReply });
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

// start server
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
