"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const abstract_1 = __importDefault(require("./abstract"));
const frame_model_compress_1 = __importDefault(require("../push_web/frame_model_compress"));
var Detection;
(function (Detection) {
    Detection[Detection["NORMAL"] = 0] = "NORMAL";
    Detection[Detection["CALIBRATION_OK"] = 1] = "CALIBRATION_OK";
    Detection[Detection["DISTURBING"] = 2] = "DISTURBING";
    Detection[Detection["NOISE"] = 3] = "NOISE";
    Detection[Detection["FAR"] = 4] = "FAR";
    Detection[Detection["APPROACHING"] = 5] = "APPROACHING";
    Detection[Detection["CLOSE_STRIKE"] = 6] = "CLOSE_STRIKE";
    Detection[Detection["STABLE_STORM"] = 7] = "STABLE_STORM";
    Detection[Detection["DEPARTING"] = 8] = "DEPARTING";
    Detection[Detection["ARRIVAL"] = 9] = "ARRIVAL";
})(Detection = exports.Detection || (exports.Detection = {}));
class AlertairTS extends abstract_1.default {
    constructor(params) {
        super();
        this.setParams(params);
    }
    getStandardFilter() {
        return {
            key: "serial",
            value: this.params.lpsfr.serial
        };
    }
    static isConnected(frame) {
        if (!frame || frame.length == 0)
            return false;
        const buffer = new Buffer(frame, "hex");
        if (buffer.length >= 10) {
            const disconnect = (buffer[9] & 2) === 2;
            if (disconnect)
                return false;
        }
        return true;
    }
    static distance(frame) {
        const buffer = new Buffer(frame, "hex");
        if (buffer.length >= 16) {
            var distance = buffer[4];
            if (distance < 0)
                distance = -1;
            if (distance > 40)
                distance = 40;
            return distance;
        }
        return -1;
    }
    static detectionType(frame) {
        const buffer = new Buffer(frame, "hex");
        if (buffer.length >= 6 && this.isConnected(frame)) {
            var detection = (buffer[5] >> 4);
            return detection;
        }
        return Detection.NORMAL;
    }
    static isAlert(frame) {
        const buffer = new Buffer(frame, "hex");
        if (buffer.length >= 6 && this.isConnected(frame)) {
            var detection = AlertairTS.detectionType(frame);
            console.log("frame >> " + frame + " // " + frame[10] + frame[11]);
            console.log("ALERTAIR TS", "detection ??? " + detection);
            switch (detection) {
                case Detection.ARRIVAL:
                case Detection.DEPARTING:
                case Detection.STABLE_STORM:
                case Detection.CLOSE_STRIKE:
                case Detection.APPROACHING:
                case Detection.FAR:
                    return true;
                case Detection.NOISE:
                case Detection.DISTURBING:
                case Detection.CALIBRATION_OK:
                case 0:
                default:
                    return false;
            }
        }
        return false;
    }
    getConnectedStateString(item) {
        const connected = item ? AlertairTS.isConnected(item.data) : false;
        return connected ? "connected" : "disconnect";
    }
    getImpactedString(item) {
        if (!item || !item.data)
            return "safe";
        if (item.data.indexOf("ffffff") == 0)
            return "alert";
        const alert = AlertairTS.isAlert(item.data);
        return alert ? "alert" : "safe";
    }
    getAdditionnalInfo1String(item) {
        return this.getDistance(item);
    }
    getAdditionnalInfo2String(item) {
        return this.getDetectionType(item);
    }
    getDistance(item) {
        if (!item || !item.data)
            return "-2";
        return "" + AlertairTS.distance(item.data);
    }
    getDetectionType(item) {
        if (!item || !item.data)
            return "-2";
        const buffer = new Buffer(item.data, "hex");
        if (buffer.length >= 16) {
            var detection = (buffer[5] >> 4);
            switch (detection) {
                case 9: return this.detectionStr(Detection.ARRIVAL);
                case 8: return this.detectionStr(Detection.DEPARTING);
                case 7: return this.detectionStr(Detection.STABLE_STORM);
                case 6: return this.detectionStr(Detection.CLOSE_STRIKE);
                case 5: return this.detectionStr(Detection.APPROACHING);
                case 4: return this.detectionStr(Detection.FAR);
                case 3: return this.detectionStr(Detection.NOISE);
                case 2: return this.detectionStr(Detection.DISTURBING);
                case 1: return this.detectionStr(Detection.CALIBRATION_OK);
                case 0:
                default:
                    return this.detectionStr(Detection.NORMAL);
            }
        }
        return "-1";
    }
    getFormattedLatestFrames() {
        return this.getLatestFrames()
            .then(transactions => transactions.map(transaction => {
            const compressed = frame_model_compress_1.default.instance.getFrameWithoutHeader(transaction.frame);
            return {
                d: transaction.timestamp,
                c: !!AlertairTS.isConnected(compressed),
                a: !!AlertairTS.isAlert(compressed),
                s: !!transaction.sent,
                t: AlertairTS.detectionType(compressed),
                km: AlertairTS.distance(compressed)
            };
        }));
    }
    detectionStr(detection) {
        switch (detection) {
            case Detection.ARRIVAL: return "arrival";
            case Detection.DEPARTING: return "departing";
            case Detection.STABLE_STORM: return "stable";
            case Detection.CLOSE_STRIKE: return "close";
            case Detection.APPROACHING: return "approaching";
            case Detection.FAR: return "far";
            case Detection.NOISE: return "noise";
            case Detection.DISTURBING: return "disturbing";
            case Detection.CALIBRATION_OK: return "cal_ok";
            default: return "normal";
        }
    }
    asMib() {
        return [
            {
                oid: this.params.oid + ".1",
                handler: (prq) => {
                    this.sendString(prq, this.params.lpsfr.serial);
                }
            },
            {
                oid: this.params.oid + ".2",
                handler: (prq) => {
                    var nodename = os_1.default.hostname();
                    this.sendString(prq, this.params.lpsfr.internal);
                }
            },
            {
                oid: this.params.oid + ".3",
                handler: (prq) => {
                    this.getLatest()
                        .then(item => {
                        this.sendString(prq, item ? item.created_at.toString() : "");
                    })
                        .catch(err => {
                        console.log(err);
                        this.sendString(prq, err);
                    });
                }
            },
            {
                oid: this.params.oid + ".4",
                handler: (prq) => {
                    this.getLatest()
                        .then(item => {
                        const behaviour = this.getConnectedStateString(item);
                        this.sendString(prq, behaviour);
                    })
                        .catch(err => {
                        console.log(err);
                        this.sendString(prq, err);
                    });
                }
            },
            {
                oid: this.params.oid + ".5",
                handler: (prq) => {
                    this.getLatest()
                        .then(item => {
                        const string = this.getImpactedString(item);
                        this.sendString(prq, string);
                    })
                        .catch(err => {
                        console.log(err);
                        this.sendString(prq, err);
                    });
                }
            },
            {
                oid: this.params.oid + ".6",
                handler: (prq) => {
                    this.getLatest()
                        .then(item => {
                        this.sendString(prq, item ? item.data : "");
                    })
                        .catch(err => {
                        console.log(err);
                        this.sendString(prq, err);
                    });
                }
            }
        ];
    }
}
exports.default = AlertairTS;
//# sourceMappingURL=alertairts.js.map