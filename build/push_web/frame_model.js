"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = __importDefault(require("./pool"));
const abstract_js_1 = __importDefault(require("../database/abstract.js"));
const pool = pool_1.default.instance;
function create_frames() {
    return pool.query("CREATE TABLE IF NOT EXISTS Frames ("
        + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
        + "`frame` VARCHAR(255) NOT NULL,"
        + "`timestamp` INTEGER NOT NULL,"
        + "`sent` INTEGER NOT NULL,"
        + "`product_id` INTEGER,"
        + "`striken` TINYINT(1) DEFAULT 0,"
        + "`connected` TINYINT(1) DEFAULT 0,"
        + "`is_alert` TINYINT(1) DEFAULT NULL,"
        + "`is_alert_disconnected` TINYINT(1) DEFAULT NULL,"
        + "KEY `timestamp` (`timestamp`)"
        + ")ENGINE=MyISAM;")
        .then(() => pool.query("ALTER TABLE Frames ADD COLUMN `product_id` INTEGER", true))
        .then(() => pool.query("ALTER TABLE Frames ADD COLUMN `striken` INTEGER", true))
        .then(() => pool.query("ALTER TABLE Frames ADD COLUMN `connected` INTEGER", true))
        .then(() => pool.query("ALTER TABLE Frames ADD COLUMN `is_alert` TINYINT(1) DEFAULT NULL", true))
        .then(() => pool.query("ALTER TABLE Frames ADD COLUMN `is_alert_disconnected` TINYINT(1) DEFAULT NULL", true))
        .then(() => pool.query("ALTER TABLE Frames ADD INDEX `product_id` (`product_id`);", true))
        .then(() => pool.query("ALTER TABLE Frames ADD INDEX `striken` (`striken`);", true))
        .then(() => pool.query("ALTER TABLE Frames ADD INDEX `connected` (`connected`);", true))
        .then(() => pool.query("ALTER TABLE Frames ADD INDEX `is_alert` (`is_alert`);", true))
        .then(() => pool.query("ALTER TABLE Frames ADD INDEX `is_alert_disconnected` (`is_alert_disconnect`);", true))
        .then(() => console.log("finished"))
        .catch(() => true);
}
create_frames().then(() => { }).catch(() => { });
const FRAME_MODEL = "Transaction";
function createInsertRows() {
    var columns = ["frame", "timestamp", "sent", "product_id"];
    columns = columns.map(col => "`" + col + "`");
    return "INSERT INTO Frames (" + columns.join(",") + ") VALUES ? ";
}
const INSERT_ROWS = createInsertRows();
function txToJson(tx, with_alert = true) {
    if (with_alert) {
        return {
            frame: tx.frame,
            timestamp: tx.timestamp,
            sent: tx.sent,
            is_alert: !!tx.is_alert,
            is_alert_disconnected: !!tx.is_alert_disconnected,
            product_id: tx.product_id
        };
    }
    return {
        frame: tx.frame,
        timestamp: tx.timestamp,
        sent: tx.sent,
        product_id: tx.product_id
    };
}
function txToArrayForInsert(tx) {
    return [
        tx.frame,
        tx.timestamp,
        tx.sent,
        tx.product_id
    ];
}
function manageErrorCrash(error, reject) {
    pool.manageErrorCrash("Frames", error, reject, create_frames);
}
class FrameModel extends abstract_js_1.default {
    constructor() {
        super();
        this.getMaximumUnsent = () => 240;
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
    /**
     * Get the lowest rssi obtained (the number are positiv, so need to multiply by -1)
     * @param count the number of frame to count from
     */
    getLowestSignal(count) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT frame FROM Frames ORDER BY id DESC LIMIT ?", [count])
                .then(result => {
                var index = 0, lowest = 0;
                if (result && result.length > 0) {
                    while (index < result.length) {
                        var current = this.getSignal(result[index].frame);
                        if (current > lowest)
                            lowest = current;
                        index++;
                    }
                }
                resolve(lowest);
            })
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    getContactair(frame) {
        //ffffffffffff0000000b01824a995a01
        var begin = 14 + 20, end = begin + 8;
        if (frame.length == 48) {
            begin -= 12, end -= 12;
            return frame.substring(begin, end).toLowerCase();
        }
        if (frame.length > 14 + 20 + 8)
            return frame.substring(begin, end).toLowerCase();
        return "";
    }
    getSignal(frame) {
        //ffffffffffff0000000b01824a995a01
        var begin = 27 * 2, end = 27 * 2 + 1;
        if (frame.length > end) {
            return parseInt(`${frame[begin]}${frame[end]}`, 16);
        }
        return 256;
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
    getCount() {
        return new Promise((resolve, reject) => {
            pool.query("SELECT COUNT(*) as count FROM Frames")
                .then(result => {
                var count = 0;
                if (result && result.length > 0)
                    count = result[0].count;
                resolve(count);
            })
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    invalidateAlerts(product_id) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("UPDATE Frames SET is_alert_disconnected = NULL, is_alert = NULL WHERE product_id = ? AND is_alert IS NOT NULL", [product_id])
                .then(results => resolve(true))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    setDevice(index, product_id, is_alert, is_alert_disconnect) {
        console.log("setDevice", { index, product_id, is_alert, is_alert_disconnect });
        return new Promise((resolve, reject) => {
            if (is_alert) {
                //it's an alert, already much more important than disconnected
                pool.queryParameters("UPDATE Frames SET product_id = ?, is_alert = ?, is_alert_disconnected = ? WHERE id = ? LIMIT 1", [product_id, !!is_alert, !!is_alert_disconnect, index])
                    .then(results => results && results.length > 0 ? resolve(true) : resolve(false))
                    .catch(err => manageErrorCrash(err, reject));
            }
            else if (is_alert_disconnect) {
                this.isLastDisconnectedState(product_id, index)
                    .then(is_disconnected => {
                    if (!is_disconnected) {
                        //it's then an alert and disconnected
                        return pool.queryParameters("UPDATE Frames SET product_id = ?, is_alert_disconnected = ?, is_alert = ? WHERE id = ? LIMIT 1", [product_id, true, true, index])
                            .then(results => results && results.length > 0 ? resolve(true) : resolve(false));
                    }
                    //if disconnected, we set the disconnected but it's not an alert
                    return pool.queryParameters("UPDATE Frames SET product_id = ?, is_alert_disconnected = ?, is_alert = ? WHERE id = ? LIMIT 1", [product_id, true, false, index])
                        .then(results => results && results.length > 0 ? resolve(true) : resolve(false));
                })
                    .catch(err => manageErrorCrash(err, reject));
            }
            else {
                pool.queryParameters("UPDATE Frames SET product_id = ?, is_alert_disconnected = ?, is_alert = ? WHERE id = ? LIMIT 1", [product_id, false, false, index])
                    .then(results => results && results.length > 0 ? resolve(true) : resolve(false))
                    .catch(err => manageErrorCrash(err, reject));
            }
        });
    }
    getFrame(index, limit) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM Frames WHERE id >= ? ORDER BY id LIMIT ?", [index, limit])
                .then(results => results && results.length > 0 ? resolve(results) : resolve(undefined))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    lasts(product_id, limit) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM Frames WHERE product_id = ? ORDER BY id DESC LIMIT ?", [product_id, limit])
                .then(results => results && results.length > 0 ? resolve(results) : resolve([]))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    lastsAlerts(product_id, limit) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM Frames WHERE is_alert = 1 AND product_id = ? ORDER BY id DESC LIMIT ?", [product_id, limit])
                .then(results => results && results.length > 0 ? resolve(results) : resolve([]))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    getPendingCalculations() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield new Promise((resolve, reject) => {
                pool.queryParameters("SELECT COUNT(*) as count FROM Frames WHERE product_id IS NOT NULL AND is_alert IS NULL ", [])
                    .then(results => resolve(results))
                    .catch(() => resolve([]));
            });
            if (result && result.length > 0)
                return result[0].count;
            return 0;
        });
    }
    getFrameIsAlert(index, limit) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM Frames WHERE id >= ? AND is_alert = 1 ORDER BY id LIMIT ?", [index, limit])
                .then(results => results && results.length > 0 ? resolve(results) : resolve(undefined))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    isLastDisconnectedState(product_id, before_index) {
        return pool.queryParameters("SELECT * FROM Frames WHERE product_id = ? AND id < ? ORDER BY id DESC LIMIT 1", [product_id, before_index])
            .then(results => results && results.length > 0 ? results[0] : undefined)
            .then(transaction => !!(transaction && transaction.is_alert_disconnected))
            .catch(err => false);
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
            pool.queryParameters("SELECT * FROM Frames WHERE timestamp < ? ORDER BY timestamp LIMIT 100", [timestamp])
                .then(results => resolve(results))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
    getUnsent(maximum) {
        if (!maximum || maximum <= 0)
            maximum = this.getMaximumUnsent();
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM Frames WHERE sent = 0 LIMIT ?", [maximum])
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
            const transaction = txToJson(tx, false);
            console.log("save", transaction);
            pool.queryParameters("INSERT INTO Frames SET ?", [transaction])
                .then(() => resolve(transaction))
                .catch(err => manageErrorCrash(err, reject));
        });
    }
}
exports.default = FrameModel;
FrameModel.instance = new FrameModel();
//# sourceMappingURL=frame_model.js.map