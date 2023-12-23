"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const abstract_1 = __importDefault(require("./abstract"));
const os_1 = __importDefault(require("os"));
const frame_model_compress_1 = __importDefault(require("../push_web/frame_model_compress"));
class AlertairDC extends abstract_1.default {
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
    static isCircuitDisconnect(frame) {
        if (!frame || frame.length == 0)
            return false;
        const buffer = new Buffer(frame, "hex");
        if (buffer.length >= 10) {
            const striken = (buffer[9] & 1) === 0;
            if (striken)
                return true;
        }
        return false;
    }
    getConnectedStateString(compressed) {
        const connected = compressed ? AlertairDC.isConnected(compressed) : false;
        return connected ? "connected" : "disconnected";
    }
    getImpactedString(compressed) {
        const circuit_disconnected = compressed ? AlertairDC.isCircuitDisconnect(compressed) : false;
        return circuit_disconnected ? "circuit_disconnect" : "circuit_normal";
    }
    format_frame(transaction, compressed) {
        return {
            d: transaction.timestamp,
            c: !!AlertairDC.isConnected(compressed),
            a: !!AlertairDC.isCircuitDisconnect(compressed),
            s: !!transaction.sent
        };
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
                    this.getLatestButAsTransaction()
                        .then(transaction => {
                        const compressed = transaction ? frame_model_compress_1.default.instance.getFrameWithoutHeader(transaction.frame)
                            : undefined;
                        const behaviour = this.getConnectedStateString(compressed);
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
                    this.getLatestButAsTransaction()
                        .then(transaction => {
                        const compressed = transaction ? frame_model_compress_1.default.instance.getFrameWithoutHeader(transaction.frame)
                            : undefined;
                        const string = this.getImpactedString(compressed);
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
exports.default = AlertairDC;
//# sourceMappingURL=alertairdc.js.map