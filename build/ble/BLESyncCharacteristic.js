"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BLEConstants_1 = require("./BLEConstants");
const safeBleno_1 = require("./safeBleno");
const frame_model_compress_1 = __importDefault(require("../push_web/frame_model_compress"));
class BLELargeSyncCharacteristic extends safeBleno_1.Characteristic {
    constructor(uuid, max, use_write, mtu) {
        super({
            uuid: uuid,
            properties: use_write ? ['write', 'read'] : ['read']
        });
        this.max = max;
        this.use_write = use_write;
        this.mtu = mtu;
        this._last_offset = 0;
        this._log_id = 0;
    }
    numberToFetch() {
        return this.max;
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
    _callback() {
        const index = this._log_id;
        console.log("get log ", { index });
        var result = { index, max: 0, txs: [] };
        var to_fetch = 1;
        var TO_FETCH_MAXIMUM = this.numberToFetch();
        return this.getMaxFrame()
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
            if (to_fetch > TO_FETCH_MAXIMUM)
                to_fetch = TO_FETCH_MAXIMUM;
            if (to_fetch < 1)
                to_fetch = 1;
            this._log_id += to_fetch;
            return value;
        })
            .then(value => this.getFrame(value, to_fetch))
            .then((transactions) => {
            if (!transactions)
                transactions = [];
            console.log("new index", { log_id: this._log_id, index: result.index });
            result.txs = transactions.map((transaction) => {
                result.index = transaction.id;
                return {
                    i: transaction.id,
                    f: frame_model_compress_1.default.instance.getCompressedFrame(transaction.frame),
                    t: transaction.timestamp,
                    s: frame_model_compress_1.default.instance.getInternalSerial(transaction.frame),
                    c: frame_model_compress_1.default.instance.getContactair(transaction.frame)
                };
            });
            if (this._log_id > result.max + 1)
                this._log_id = result.max + 1;
            return JSON.stringify(result);
        });
    }
    readOrSend(offset) {
        if (offset > 0 && this._last_offset <= offset) {
            return new Promise((resolve) => {
                this._last_offset = offset;
                resolve(this._obtained);
            });
        }
        return this._callback()
            .then(value => {
            this._obtained = Buffer.from(value, "utf-8");
            this._last_offset = offset;
            return this._obtained;
        });
    }
    onReadRequest(offset, cb) {
        const length = this._obtained ? this._obtained.length : 0;
        console.log("offset := ", { offset, length });
        this.readOrSend(offset)
            .then(buffer => {
            const current_mtu = Math.max(0, this.mtu() - 4);
            if (current_mtu >= buffer.byteLength - offset) {
                console.log("ended !");
            }
            cb(BLEConstants_1.RESULT_SUCCESS, buffer.subarray(offset));
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
exports.BLELargeSyncCharacteristic = BLELargeSyncCharacteristic;
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
    numberToFetch() {
        return 7;
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
        console.log("get log ", { index });
        var result = { index, max: 0, txs: [] };
        var to_fetch = 1;
        var TO_FETCH_MAXIMUM = this.numberToFetch();
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
            if (to_fetch > TO_FETCH_MAXIMUM)
                to_fetch = TO_FETCH_MAXIMUM;
            if (to_fetch < 1)
                to_fetch = 1;
            this._log_id += to_fetch;
            return value;
        })
            .then(value => this.getFrame(value, to_fetch))
            .then(transactions => {
            console.log("new index", { log_id: this._log_id, index: result.index });
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
exports.BLESyncCharacteristic = BLESyncCharacteristic;
//# sourceMappingURL=BLESyncCharacteristic.js.map