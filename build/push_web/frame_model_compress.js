"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = __importDefault(require("./pool"));
const abstract_js_1 = __importDefault(require("../database/abstract.js"));
const frame_model_1 = __importDefault(require("./frame_model"));
const pool = pool_1.default.instance;
pool.query("CREATE TABLE IF NOT EXISTS FramesCompress ("
    + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
    + "`original_id` INT NULL UNIQUE,"
    + "`frame` VARCHAR(255) NOT NULL,"
    + "`timestamp` INTEGER NOT NULL,"
    + "`sent` INTEGER NOT NULL,"
    + "`product_id` INTEGER,"
    + "`striken` TINYINT(1) DEFAULT 0,"
    + "`connected` TINYINT(1) DEFAULT 0,"
    + "`is_alert` TINYINT(1) DEFAULT NULL,"
    + "KEY `timestamp` (`timestamp`)"
    + ")ENGINE=MyISAM;")
    .then(() => pool.query("ALTER TABLE FramesCompress ADD COLUMN `product_id` INTEGER", true))
    .then(() => pool.query("ALTER TABLE FramesCompress ADD COLUMN `striken` INTEGER", true))
    .then(() => pool.query("ALTER TABLE FramesCompress ADD COLUMN `connected` INTEGER", true))
    .then(() => pool.query("ALTER TABLE FramesCompress ADD COLUMN `is_alert` TINYINT(1) DEFAULT NULL", true))
    .then(() => pool.query("ALTER TABLE FramesCompress ADD INDEX `product_id` (`product_id`);", true))
    .then(() => pool.query("ALTER TABLE FramesCompress ADD INDEX `striken` (`striken`);", true))
    .then(() => pool.query("ALTER TABLE FramesCompress ADD INDEX `connected` (`connected`);", true))
    .then(() => pool.query("ALTER TABLE FramesCompress ADD INDEX `is_alert` (`is_alert`);", true))
    .then(() => console.log("finished"))
    .catch(err => console.log(err));
const FRAME_MODEL = "Transaction";
function createInsertRows() {
    var columns = ["frame", "timestamp", "sent"];
    columns = columns.map(col => "`" + col + "`");
    return "INSERT INTO FramesCompress (" + columns.join(",") + ") VALUES ? ";
}
const INSERT_ROWS = createInsertRows();
function txToJson(tx) {
    return {
        frame: tx.frame,
        timestamp: tx.timestamp,
        sent: tx.sent
    };
}
function txToArrayForInsert(tx) {
    return [
        tx.frame,
        tx.timestamp,
        tx.sent
    ];
}
function manageErrorCrash(error, reject) {
    pool.manageErrorCrash("FramesCompress", error, reject);
}
class FrameModelCompress extends abstract_js_1.default {
    constructor() {
        super();
        this._contactair_cache = [];
        this._syncing = false;
        this._temp_syncing = [];
    }
    getModelName() {
        return FRAME_MODEL;
    }
    hasData(device, timestamp_in_past) {
        var append = "";
        if (timestamp_in_past)
            append = "AND timestamp > ?";
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT COUNT(*) FROM FramesCompress WHERE product_id = ? " + append + " ORDER BY timestamp LIMIT 100", [device.id, timestamp_in_past])
                .then(results => resolve(results))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    invalidateAlerts(product_id) {
        return new Promise((resolve, reject) => {
            console.log("set is_alert = null where id", product_id);
            pool.queryParameters("UPDATE FramesCompress SET is_alert = NULL WHERE product_id = ? AND is_alert IS NOT NULL", [product_id])
                .then(results => resolve(true))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    getRelevantByte(frame) {
        var compressed = this.getCompressedFrame(frame);
        if (compressed && compressed.length > 0) {
            return compressed.slice(-2);
        }
        return "00";
    }
    getFrameWithoutHeader(frame) {
        if (frame && frame.length > 14 + 20 + 8)
            return frame.substring(14, 14 + 20 + 8);
        return frame;
    }
    //ffffff - ffffff0000000b - 01824a - 995a01
    getCompressedFrame(frame) {
        return frame_model_1.default.instance.getCompressedFrame(frame);
    }
    getInternalSerial(frame) {
        return frame_model_1.default.instance.getInternalSerial(frame);
    }
    getContactair(frame) {
        //ffffffffffff0000000b01824a995a01
        return frame_model_1.default.instance.getContactair(frame);
    }
    getMinFrame() {
        return new Promise((resolve, reject) => {
            pool.query("SELECT MIN(id) as m FROM FramesCompress")
                .then(result => {
                var index = 0;
                if (result && result.length > 0)
                    index = result[0].m;
                console.log("getMinFrame", result);
                resolve(index);
            })
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    getMaxFrame() {
        return new Promise((resolve, reject) => {
            pool.query("SELECT MAX(id) as m FROM FramesCompress")
                .then(result => {
                var index = 0;
                if (result && result.length > 0)
                    index = result[0].m;
                console.log("getMaxFrame", result);
                resolve(index);
            })
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    getFrame(index, limit) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM FramesCompress WHERE id >= ? ORDER BY id LIMIT ?", [index, limit])
                .then(results => results && results.length > 0 ? resolve(results) : resolve(undefined))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    start() {
        if (!this._syncing) {
            console.log("start migrating...");
            this._syncing = true;
            var index = 0;
            var callback = (from) => {
                pool.queryParameters("SELECT * FROM Frames WHERE id >= ? ORDER BY id LIMIT 500", [from])
                    .then((results) => {
                    if (results && results.length > 0) {
                        var subcall = (idx) => {
                            if (idx >= results.length) {
                                callback(index + 1);
                            }
                            else {
                                const transaction = results[idx];
                                if (transaction.id && transaction.id > index)
                                    index = transaction.id;
                                this.save(transaction, true)
                                    .then(saved => subcall(idx + 1))
                                    .catch(err => subcall(idx + 1));
                            }
                        };
                        subcall(0);
                    }
                    else {
                        this.flushAwaiting();
                    }
                })
                    .catch(err => manageErrorCrash(err, () => { }));
            };
            callback(0);
        }
    }
    flushAwaiting() {
        var callback = (index) => {
            if (index > this._temp_syncing.length) {
                const resolve = this._temp_syncing[index].resolve;
                const reject = this._temp_syncing[index].reject;
                const transaction = this._temp_syncing[index].transaction;
                this.save(transaction, true)
                    .then(saved => {
                    resolve(saved);
                    callback(index + 1);
                })
                    .catch(err => {
                    reject(err);
                    callback(index + 1);
                });
            }
            else {
                //done
                this._syncing = false;
            }
        };
        callback(0);
    }
    save(tx, force = false) {
        return new Promise((resolve, reject) => {
            if (this._syncing && !force) {
                this._temp_syncing.push({ resolve, reject, transaction: tx });
                return;
            }
            const contactair = this.getContactair(tx.frame);
            const data = this.getRelevantByte(tx.frame);
            var cache = { data: null, timeout: 11 };
            //console.log("managing frame := " + contactair+" data:="+data);
            if (!this._contactair_cache[contactair]) {
                this._contactair_cache[contactair] = cache;
            }
            else {
                cache = this._contactair_cache[contactair];
            }
            tx.timestamp = Math.floor(Date.now() / 1000);
            const transaction = txToJson(tx);
            if (tx.id)
                transaction.original_id = tx.id;
            cache.timeout--;
            if (cache.data && cache.data == data && cache.timeout > 0) {
                //now set the new cache for this round
                this._contactair_cache[contactair] = cache;
                //console.log("don't save the frame for " + contactair + " already known for this round, remaining " + cache.timeout);
                resolve(transaction);
                return;
            }
            //the frame can be saved
            cache.data = data;
            cache.timeout = 30;
            this._contactair_cache[contactair] = cache;
            pool.queryParameters("INSERT INTO FramesCompress SET ?", [transaction])
                .then(() => resolve(transaction))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
}
FrameModelCompress.instance = new FrameModelCompress();
exports.default = FrameModelCompress;
//# sourceMappingURL=frame_model_compress.js.map