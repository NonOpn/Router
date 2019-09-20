"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const MONGO_SNMP = "mongodb://localhost/blog";
var DATA_POINT = new mongoose_1.default.Schema({
    serial: { type: String, default: "" },
    internal: { type: String, default: "" },
    contactair: { type: String, default: "" },
    enocean_relay: { type: String, default: "" },
    data: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
});
var options = { promiseLibrary: global.Promise };
var db = mongoose_1.default.createConnection(MONGO_SNMP, options);
var DataPointModel = db.model("DataPointModel", DATA_POINT);
class DataPoint {
    constructor() {
    }
    savePoint(serial, internal, contactair, data) {
        return new Promise((resolve, reject) => {
            console.log("save " + serial + " " + internal + " " + contactair);
            const object = new DataPointModel({
                serial: serial,
                internal: internal,
                contactair: contactair,
                data: data
            });
            object.save((err) => {
                if (err)
                    reject(err);
                else
                    resolve(object);
            });
        });
    }
    latestForContactair(contactair) {
        return this.findLatestWithParams({ contactair: contactair });
    }
    latestForSerial(serial) {
        return this.findLatestWithParams({ serial: serial });
    }
    latestForInternal(internal) {
        return this.findLatestWithParams({ internal: internal });
    }
    findLatestWithParams(params) {
        return new Promise((resolve, reject) => {
            this.queryWithParams(params)
                .findOne()
                .sort({ "created_at": -1 })
                .exec((err, data) => {
                if (err)
                    reject(err);
                else
                    resolve(data);
            });
        });
    }
    queryWithParams(params) {
        return DataPointModel.find(params);
    }
}
DataPoint.instance = new DataPoint();
exports.default = DataPoint;
//# sourceMappingURL=data_point.js.map