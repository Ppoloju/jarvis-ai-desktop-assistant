const express = require("express");
const cors = require("cors");

const app = express();

const automationRoutes = require("./routes/automation/automation.routes");

app.use(cors());
app.use(express.json());

app.use("/api/automation", automationRoutes);

app.get("/", (req, res) => {
  res.send("Jarvis Backend Running");
});

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});