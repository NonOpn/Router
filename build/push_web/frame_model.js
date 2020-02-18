"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = __importDefault(require("./pool"));
const abstract_js_1 = __importDefault(require("../database/abstract.js"));
const pool = pool_1.default.instance;
pool.query("CREATE TABLE IF NOT EXISTS Frames ("
    + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
    + "`frame` VARCHAR(255) NOT NULL,"
    + "`timestamp` INTEGER NOT NULL,"
    + "`sent` INTEGER NOT NULL,"
    + "`product_id` INTEGER,"
    + "`striken` TINYINT(1) DEFAULT 0,"
    + "`connected` TINYINT(1) DEFAULT 0,"
    + "`is_alert` TINYINT(1) DEFAULT NULL,"
    + "KEY `timestamp` (`timestamp`)"
    + ")ENGINE=MyISAM;")
    .then(() => pool.query("ALTER TABLE Frames ADD COLUMN `product_id` INTEGER", true))
    .then(() => pool.query("ALTER TABLE Frames ADD COLUMN `striken` INTEGER", true))
    .then(() => pool.query("ALTER TABLE Frames ADD COLUMN `connected` INTEGER", true))
    .then(() => pool.query("ALTER TABLE Frames ADD COLUMN `is_alert` TINYINT(1) DEFAULT NULL", true))
    .then(() => pool.query("ALTER TABLE Frames ADD INDEX `product_id` (`product_id`);", true))
    .then(() => pool.query("ALTER TABLE Frames ADD INDEX `striken` (`striken`);", true))
    .then(() => pool.query("ALTER TABLE Frames ADD INDEX `connected` (`connected`);", true))
    .then(() => pool.query("ALTER TABLE Frames ADD INDEX `is_alert` (`is_alert`);", true))
    .then(() => console.log("finished"))
    .catch(err => console.log(err));
const FRAME_MODEL = "Transaction";
function createInsertRows() {
    var columns = ["frame", "timestamp", "sent"];
    columns = columns.map(col => "`" + col + "`");
    return "INSERT INTO Frames (" + columns.join(",") + ") VALUES ? ";
}
const INSERT_ROWS = createInsertRows();
function txToJson(tx) {
    return {
        frame: tx.frame,
        timestamp: tx.timestamp,
        sent: tx.sent,
        is_alert: !!tx.is_alert,
        product_id: tx.product_id
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
    pool.manageErrorCrash("Frames", error, reject);
}
class FrameModel extends abstract_js_1.default {
    constructor() {
        super();
    }
    getModelName() {
        return FRAME_MODEL;
    }
    from(frame, sent = 0) {
        return {
            timestamp: Math.floor(Date.now() / 1000),
            frame: frame,
            sent: sent
        };
    }
    setSent(id, sent) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("UPDATE Frames SET sent = ? WHERE id = ? ", [sent, id])
                .then(results => {
                if (results && results.length > 0)
                    resolve(results[0]);
                else
                    resolve(undefined);
            })
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    hasData(device, timestamp_in_past) {
        var append = "";
        if (timestamp_in_past)
            append = "AND timestamp > ?";
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT COUNT(*) FROM Frames WHERE product_id = ? " + append + " ORDER BY timestamp LIMIT 100", [device.id, timestamp_in_past])
                .then(results => resolve(results))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    getCompressedFrame(frame) {
        if (frame && frame.length > 14 + 20 + 8)
            return frame.substring(14 + 6, 14 + 20);
        return frame;
    }
    getInternalSerial(frame) {
        return frame.substring(14 + 0, 14 + 6).toLowerCase();
    }
    getContactair(frame) {
        //ffffffffffff0000000b01824a995a01
        if (frame.length > 14 + 20 + 8)
            return frame.substring(14 + 20, 14 + 20 + 8).toLowerCase();
        return "";
    }
    getMinFrame() {
        return new Promise((resolve, reject) => {
            pool.query("SELECT MIN(id) as m FROM Frames")
                .then(result => {
                var index = 0;
                if (result && result.length > 0)
                    index = result[0].m;
                resolve(index);
            })
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    getMaxFrame() {
        return new Promise((resolve, reject) => {
            pool.query("SELECT MAX(id) as m FROM Frames")
                .then(result => {
                var index = 0;
                if (result && result.length > 0)
                    index = result[0].m;
                resolve(index);
            })
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    setDevice(index, product_id, is_alert) {
        if (is_alert == undefined) {
            return new Promise((resolve, reject) => {
                pool.queryParameters("UPDATE Frames SET product_id = ? WHERE id = ? LIMIT 1", [product_id, index])
                    .then(results => results && results.length > 0 ? resolve(true) : resolve(false))
                    .catch(err => manageErrorCrash(err, reject));
            });
        }
        return new Promise((resolve, reject) => {
            pool.queryParameters("UPDATE Frames SET product_id = ?, is_alert = ? WHERE id = ? LIMIT 1", [product_id, !!is_alert, index])
                .then(results => results && results.length > 0 ? resolve(true) : resolve(false))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    getFrame(index, limit) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM Frames WHERE id >= ? ORDER BY id LIMIT ?", [index, limit])
                .then(results => results && results.length > 0 ? resolve(results) : resolve(undefined))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    getFrameIsAlert(index, limit) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM Frames WHERE id >= ? AND is_alert = 1 ORDER BY id LIMIT ?", [index, limit])
                .then(results => results && results.length > 0 ? resolve(results) : resolve(undefined))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    beforeForDevice(device, timestamp) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM Frames WHERE product_id = ? AND timestamp < ? ORDER BY timestamp LIMIT 100", [device.id, timestamp])
                .then(results => resolve(results))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    before(timestamp) {
        return new Promise((resolve, reject) => {
            console.log(timestamp);
            pool.queryParameters("SELECT * FROM Frames WHERE timestamp < ? ORDER BY timestamp LIMIT 100", [timestamp])
                .then(results => resolve(results))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    getUnsent() {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM Frames WHERE sent = 0 LIMIT 100")
                .then(results => resolve(results))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    saveMultiple(txs) {
        return new Promise((resolve, reject) => {
            const array = [];
            try {
                txs.forEach(transaction => {
                    transaction.timestamp = Math.floor(Date.now() / 1000);
                    array.push(txToArrayForInsert(transaction));
                });
            }
            catch (e) {
            }
            pool.queryParameters(INSERT_ROWS, [array])
                .then(() => resolve(txs))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    save(tx) {
        return new Promise((resolve, reject) => {
            tx.timestamp = Math.floor(Date.now() / 1000);
            const transaction = txToJson(tx);
            pool.queryParameters("INSERT INTO Frames SET ?", [transaction])
                .then(() => resolve(transaction))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
}
FrameModel.instance = new FrameModel();
exports.default = FrameModel;
//# sourceMappingURL=frame_model.js.map