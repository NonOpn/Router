const express = require("express"),
config = require("../../config/config"),
router = express.Router(),
frame_model = require("../../push_web/frame_model");

function logs(req, res, timestamp) {
  timestamp = timestamp || Math.floor(new Date()/1000);
  frame_model.before(timestamp)
  .then(results => {
    const array = results.map(r => {
      return {timestamp: r.timestamp, frame: r.frame, sent: r.sent};
    });

    res.json({
      logs: array
    });
  }).catch(err => {
    console.log(err);
    res.json({
      error: "error in the rout@ir"
    });
  });
}

router.get("/logs.json", (req, res) => {
  logs(req, res, req.query.from);
});

router.post("/logs.json", (req, res) => {
  req.body = req.body || {};
  logs(req, res, req.body.from);
});

module.exports = router;
