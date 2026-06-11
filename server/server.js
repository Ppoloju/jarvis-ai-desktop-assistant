const express = require("express");
const cors = require("cors");

const logger = require("./middlewares/logger");

const app = express();

app.use(cors());
app.use(express.json());

app.use(logger);

app.get("/", (req, res) => {
  res.send("Jarvis Backend Running");
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});