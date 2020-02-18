"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const BLEConstants_1 = require("./BLEConstants");
const safeBleno_1 = require("./safeBleno");
const frame_model_compress_1 = __importDefault(require("../push_web/frame_model_compress"));
class BLESyncCharacteristic extends safeBleno_1.Characteristic {
    constructor(uuid, compress = false, use_write = true) {
        super({
            uuid: uuid,
            properties: use_write ? ['write', 'read'] : ['read']
        });
        this._log_id = 0;
        this._compress = compress;
        this._last = Buffer.from("");
    }
    getMaxFrame() {
        return Promise.resolve(-1);
    }
    getMinFrame() {
        return Promise.resolve(-1);
    }
    getFrame(value, to_fetch) {
        return Promise.resolve([]);
    }
    onReadRequest(offset, cb) {
        if (offset > 0 && offset < this._last.length) {
            const sub = this._last.subarray(offset);
            cb(BLEConstants_1.RESULT_SUCCESS, sub);
            return;
        }
        console.log(offset);
        const index = this._log_id;
        console.log("get log ", index);
        var result = {
            index: index,
            max: 0,
            txs: []
        };
        var to_fetch = 1;
        this.getMaxFrame()
            .then(maximum => {
            result.max = maximum;
            if (this._log_id > maximum) {
                this._log_id = maximum + 1; //prevent looping
            }
            return this.getMinFrame();
        })
            .then(minimum => {
            //check the minimum index to fetch values from
            if (minimum > this._log_id)
                this._log_id = minimum;
            return minimum > index ? minimum : index;
        })
            .then(value => {
            //get at least 1..4 transactions
            to_fetch = result.max - value;
            if (to_fetch > 7)
                to_fetch = 7;
            if (to_fetch < 1)
                to_fetch = 1;
            this._log_id += to_fetch;
            return value;
        })
            .then(value => this.getFrame(value, to_fetch))
            .then(transactions => {
            console.log("new index", this._log_id + " " + result.index);
            if (transactions) {
                transactions.forEach((transaction) => {
                    result.index = transaction.id;
                    if (!this._compress) {
                        const arr = {
                            i: transaction.id,
                            f: frame_model_compress_1.default.instance.getCompressedFrame(transaction.frame),
                            t: transaction.timestamp,
                            s: frame_model_compress_1.default.instance.getInternalSerial(transaction.frame),
                            c: frame_model_compress_1.default.instance.getContactair(transaction.frame)
                        };
                        result.txs.push(arr);
                    }
                    else {
                        const arr = transaction.id + "," +
                            frame_model_compress_1.default.instance.getCompressedFrame(transaction.frame) + "," +
                            transaction.timestamp + "," +
                            frame_model_compress_1.default.instance.getInternalSerial(transaction.frame) + "," +
                            frame_model_compress_1.default.instance.getContactair(transaction.frame) + ",";
                        result.txs.push(arr);
                    }
                });
            }
            if (this._log_id > result.max + 1) {
                this._log_id = result.max + 1;
            }
            var output = JSON.stringify(result);
            if (this._compress) {
                output = result.index + "," + result.max + "," + result.txs.concat();
            }
            this._last = Buffer.from(output, "utf-8");
            cb(BLEConstants_1.RESULT_SUCCESS, this._last);
        })
            .catch(err => {
            console.error(err);
            cb(BLEConstants_1.RESULT_UNLIKELY_ERROR, Buffer.from("", "utf-8"));
        });
    }
    onWriteRequest(data, offset, withoutResponse, callback) {
        console.log("offset := " + offset);
        console.log(data.toString());
        var config = data.toString();
        var configuration = {};
        try {
            configuration = JSON.parse(config);
        }
        catch (e) {
            configuration = {};
        }
        if (configuration && configuration.index) {
            this._log_id = configuration.index;
            callback(BLEConstants_1.RESULT_SUCCESS);
        }
        else {
            callback(BLEConstants_1.RESULT_UNLIKELY_ERROR);
        }
    }
    ;
}
exports.default = BLESyncCharacteristic;
//# sourceMappingURL=BLESyncCharacteristic.js.map