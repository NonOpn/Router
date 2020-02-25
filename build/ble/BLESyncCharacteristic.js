"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BLEConstants_1 = require("./BLEConstants");
const safeBleno_1 = require("./safeBleno");
const frame_model_compress_1 = __importDefault(require("../push_web/frame_model_compress"));
class BLELargeSyncCharacteristic extends safeBleno_1.Characteristic {
    constructor(uuid, max, compress, use_write, mtu) {
        super({
            uuid: uuid,
            properties: use_write ? ['write', 'read'] : ['read']
        });
        this.max = max;
        this.compress = compress;
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
    transform(transaction) {
        var payload = "";
        if (this.compress) {
            payload = [transaction.id,
                frame_model_compress_1.default.instance.getCompressedFrame(transaction.frame),
                transaction.timestamp,
                frame_model_compress_1.default.instance.getInternalSerial(transaction.frame),
                frame_model_compress_1.default.instance.getContactair(transaction.frame)
            ].join(",");
            payload = `[${payload}]`;
        }
        else {
            payload = JSON.stringify({
                i: transaction.id,
                f: frame_model_compress_1.default.instance.getCompressedFrame(transaction.frame),
                t: transaction.timestamp,
                s: frame_model_compress_1.default.instance.getInternalSerial(transaction.frame),
                c: frame_model_compress_1.default.instance.getContactair(transaction.frame)
            });
        }
        return { index: transaction.id || 0, payload };
    }
    fromPayload(payload) {
        if (this.compress) {
            return payload;
        }
        return JSON.parse(payload);
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
            const payloads = transactions.map((transaction) => this.transform(transaction));
            const copy = [];
            var idx = 0;
            var count = 0;
            while (idx < payloads.length && count < 450) { //TODO strip this magic number off...
                const { payload } = payloads[idx];
                if (payload.length + count < 450) {
                    copy.push(payloads[idx]);
                }
                //add the size to stop it
                count += payload.length;
                idx++;
            }
            if (copy.length > 0)
                result.index = copy[copy.length - 1].index;
            result.txs = copy.map(p => this.fromPayload(p.payload));
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
            cb(BLEConstants_1.RESULT_SUCCESS, buffer.slice(offset));
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
//# sourceMappingURL=BLESyncCharacteristic.js.map