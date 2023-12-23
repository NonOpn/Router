"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const abstract_1 = __importDefault(require("./abstract"));
const frame_model_compress_1 = __importDefault(require("../push_web/frame_model_compress"));
class Ellips extends abstract_1.default {
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
    getConnectedStateString(compressed) {
        if (!compressed)
            return " ";
        const buffer = new Buffer(compressed, "hex");
        if (buffer.length >= 4) {
            const disconnect = (buffer[3] & 2) === 2;
            if (disconnect)
                return "disconnected";
        }
        return "connected";
    }
    getImpactedString(compressed) {
        if (!compressed)
            return " ";
        const buffer = new Buffer(compressed, "hex");
        if (buffer.length >= 4) {
            const disconnect = (buffer[3] & 1) === 0;
            if (disconnect)
                return "striken";
        }
        return "normal";
    }
    format_frame(transaction, compressed) {
        return {
            d: transaction.timestamp,
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
            }
        ];
    }
}
exports.default = Ellips;
//# sourceMappingURL=ellips.js.map