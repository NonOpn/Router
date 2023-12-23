"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLETimeCharacteristic = void 0;
const BLEConstants_1 = require("./BLEConstants");
const safeBleno_1 = require("./safeBleno");
class BLETimeCharacteristic extends safeBleno_1.Characteristic {
    constructor(uuid) {
        super({
            uuid: uuid,
            properties: ['write', 'read']
        });
    }
    onReadRequest(offset, cb) {
        cb(BLEConstants_1.RESULT_SUCCESS, Buffer.from(JSON.stringify({
            timestampms: Date.now()
        }), "utf-8"));
    }
    onWriteRequest(data, offset, withoutResponse, callback) {
        //TODO : add management to force a default date when loading the routair ?
        callback(BLEConstants_1.RESULT_SUCCESS);
    }
    ;
}
exports.BLETimeCharacteristic = BLETimeCharacteristic;
//# sourceMappingURL=BLETimeCharacteristic.js.map