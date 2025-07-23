"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = __importDefault(require("../push_web/pool"));
const pool = pool_1.default.instance;
pool.query("CREATE TABLE IF NOT EXISTS DataPoint ("
    + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
    + "`serial` VARCHAR(255) NOT NULL,"
    + "`internal` VARCHAR(255) NOT NULL,"
    + "`contactair` VARCHAR(255) NOT NULL,"
    + "`enocean_relay` VARCHAR(255) NOT NULL,"
    + "`data` VARCHAR(255) NOT NULL,"
    + "`created_at` INTEGER NOT NULL"
    + ")ENGINE=MyISAM;")
    .then(() => console.log("table creation finished"));
class DataPoint {
    constructor() {
    }
    savePoint(serial, internal, contactair, data) {
        return new Promise((resolve, reject) => {
            const created_at = new Date();
            const enocean_relay = "";
            const point = {
                serial,
                internal,
                contactair,
                enocean_relay,
                data,
                created_at
            };
            pool.queryParameters("INSERT INTO DataPoint SET ?", [{
                    serial,
                    internal,
                    contactair,
                    enocean_relay,
                    data,
                    created_at: created_at.getTime()
                }])
                .then(() => resolve(point))
                .catch(error => pool.manageErrorCrash("DataPoint", error, reject));
        });
    }
    latestForContactair(contactair) {
        return this.findMatching("contactair", contactair);
    }
    latestForSerial(serial) {
        return this.findMatching("serial", serial);
    }
    latestForInternal(internal) {
        return this.findMatching("internal", internal);
    }
    findMatching(key, value) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM DataPoint WHERE `" + key + "` = ? ORDER BY created_at DESC", [value])
                .then(results => resolve(results && results.length > 0 ? results[0] : undefined))
                .catch(error => pool.manageErrorCrash("DataPoint", error, reject));
        });
    }
}
DataPoint.instance = new DataPoint();
exports.default = DataPoint;
//# sourceMappingURL=data_point.js.map