const express = require("express"),
config = require("../../config/config");
router = express.Router();

router.get("/infos.json", (req, res) => {
  const date = new Date();
  res.json({
    timestamp: Math.floor(date/1000),
    date: date,
    identity: config.identity,
    version: config.version
  });
});

module.exports = router;
