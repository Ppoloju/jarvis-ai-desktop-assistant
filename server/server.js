const express = require("express");
const cors = require("cors");

const app = express();

const automationRoutes = require("./routes/automation/automation.routes");
const systemRoutes = require("./routes/system.routes");
app.use(cors());
app.use(express.json());

app.use("/api/automation", automationRoutes);
app.use("/api/system", systemRoutes);
app.get("/", (req, res) => {
  res.send("Jarvis Backend Running");
});

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});