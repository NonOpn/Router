"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const frame_model_1 = __importDefault(require("../../push_web/frame_model"));
const express_1 = __importDefault(require("express"));
const wifi_1 = __importDefault(require("../../wifi/wifi"));
const router = express_1.default.Router();
const frame_model = frame_model_1.default.instance;
const wifi = wifi_1.default.instance;
function logs(req, res, timestamp) {
    timestamp = timestamp || Math.floor(new Date().getTime() / 1000);
    frame_model.before(timestamp.getTime())
        .then(results => {
        const array = results.map(r => {
            return { timestamp: r.timestamp, frame: r.frame, sent: r.sent };
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
    if (ssid && passphrase) {
        const network = {
            ssid: ssid,
            passphrase: passphrase
        };
        wifi.storeConfiguration(network)
            .then(success => {
            if (success === true) {
                res.json({
                    result: "configuration saved"
                });
            }
            else {
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
    }
    else {
        res.json({
            error: "error in the parameters"
        });
    }
});
exports.default = router;
//# sourceMappingURL=api_v1.js.map