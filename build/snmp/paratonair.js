"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const abstract_1 = __importDefault(require("./abstract"));
const comptair_1 = __importDefault(require("./comptair"));
const frame_model_compress_1 = __importDefault(require("../push_web/frame_model_compress"));
class Paratonair extends abstract_1.default {
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
        if (buffer.length >= 16) {
            const disconnect = (buffer[9] & 2) === 2;
            if (disconnect)
                return false;
        }
        return true;
    }
    static isStriken(frame) {
        if (!frame || frame.length == 0)
            return false;
        const buffer = new Buffer(frame, "hex");
        if (buffer.length >= 16) {
            const striken = (buffer[9] & 1) === 0;
            if (striken)
                return true;
        }
        return false;
    }
    getConnectedStateString(item) {
        const connected = item ? comptair_1.default.isConnected(item.data) : false;
        return connected ? "connected" : "disconnect";
    }
    getImpactedString(item) {
        const connected = item ? comptair_1.default.isStriken(item.data) : false;
        return connected ? "striken" : "normal";
    }
    getFormattedLatestFrames() {
        return this.getLatestFrames()
            .then(transactions => transactions.map(transaction => {
            const compressed = frame_model_compress_1.default.instance.getFrameWithoutHeader(transaction.frame);
            return {
                d: transaction.timestamp,
                c: Paratonair.isConnected(compressed),
                a: Paratonair.isStriken(compressed),
                s: !!transaction.sent
            };
        }));
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
exports.default = Paratonair;
//# sourceMappingURL=paratonair.js.map