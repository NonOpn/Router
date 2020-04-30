import express from "express";
import config from "../../config/config";

const router = express.Router();

router.get("/infos.json", (req: any, res: any) => {
  const date = new Date();
  res.json({
    timestamp: Math.floor(date.getTime()/1000),
    date: date,
    identity: config.identity,
    version: config.version
  });
});

export default router;
