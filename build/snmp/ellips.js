"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const abstract_1 = __importDefault(require("./abstract"));
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
    getConnectedStateString(item) {
        if (!item || !item.data)
            return " ";
        const buffer = new Buffer(item.data, "hex");
        if (buffer.length >= 4) {
            const disconnect = (buffer[3] & 2) === 2;
            if (disconnect)
                return "disconnect";
        }
        return "connected";
    }
    getImpactedString(item) {
        if (!item || !item.data)
            return " ";
        const buffer = new Buffer(item.data, "hex");
        if (buffer.length >= 4) {
            const disconnect = (buffer[3] & 1) === 0;
            if (disconnect)
                return "striken";
        }
        return "normal";
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
            }
        ];
    }
}
exports.default = Ellips;
//# sourceMappingURL=ellips.js.map