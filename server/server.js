import express from "express";
import cors from "cors";

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// test route (IMPORTANT for debugging)
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});