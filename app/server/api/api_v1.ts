import { WifiConfiguration } from './../../wifi/wifi';
import FrameModel from '../../push_web/frame_model';
import express from "express";
import Wifi from "../../wifi/wifi";

const router = express.Router();

const frame_model = FrameModel.instance;
const wifi = Wifi.instance;

function logs(req: any, res: any, timestamp: Date) {
  timestamp = timestamp || Math.floor(new Date().getTime()/1000);
  frame_model.before(timestamp.getTime())
  .then(results => {
    const array = results.map(r => {
      return {timestamp: r.timestamp, frame: r.frame, sent: r.sent};
    });

    res.json({ logs: array });
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

router.post("/wifi/config.json", (req, res) => {
  req.body = req.body || {};

  const ssid = req.body.ssid;
  const passphrase = req.body.passphrase;

  if(ssid && passphrase) {
    const network: WifiConfiguration = {
      ssid: ssid,
      passphrase: passphrase
    };
    
    wifi.storeConfiguration(network)
    .then(success => {
      if(success === true) {
        res.json({
          result: "configuration saved"
        });
      } else {
        res.json({
          error: "error while saving"
        });
      }
    }).catch(err => {
      console.log(err);
      res.json({
        error: "error while saving"
      });
    });
  } else {
    res.json({
      error: "error in the parameters"
    });
  }
});

export default router;
