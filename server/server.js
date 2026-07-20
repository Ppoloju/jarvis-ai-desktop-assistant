import express from "express";
import cors from "cors";

const logger = require("./middlewares/logger");

// middleware
app.use(cors());
app.use(express.json());

// test route (IMPORTANT for debugging)
const app = express();
const fileRoutes = require("./routes/files/files.routes");
const automationRoutes = require("./routes/automation/automation.routes");
const systemRoutes = require("./routes/system.routes");
const reminderRoutes = require("./routes/reminders/reminders.routes");
app.use(cors());
app.use(express.json());

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

// start server
const PORT = 5000;
const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});