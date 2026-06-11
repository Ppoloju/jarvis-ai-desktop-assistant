const express = require("express");
const router = express.Router();

router.post("/open-website", (req, res) => {
  res.json({
    success: true,
  });
});

module.exports = router;