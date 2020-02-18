"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = __importDefault(require("./pool"));
const abstract_js_1 = __importDefault(require("../database/abstract.js"));
const pool = pool_1.default.instance;
function create() {
    pool.query("CREATE TABLE IF NOT EXISTS Device ("
        + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
        + "`serial` VARCHAR(20) NOT NULL,"
        + "`internal_serial` VARCHAR(20) NOT NULL,"
        + "`last_contactair` VARCHAR(20),"
        + "`last_contactair_index` INTEGER DEFAULT 0,"
        + "`type_set` TINYINT(1) DEFAULT 0,"
        + "`type` INTEGER,"
        + "KEY `internal_serial` (`internal_serial`)"
        + ")ENGINE=MyISAM;")
        .then(() => pool.query("ALTER TABLE Device ADD COLUMN `last_contactair` VARCHAR(20)", true))
        .then(results => {
        console.log("device_model done");
    });
}
pool.query("REPAIR TABLE Device")
    .then(() => create())
    .catch(err => {
    console.log(err);
    create();
});
const MODEL = "Device";
function createInsertRows() {
    var columns = ["serial", "internal_serial", "type", "last_contactair", "last_contactair_index"];
    columns = columns.map(col => "`" + col + "`");
    return "INSERT INTO Device (" + columns.join(",") + ") VALUES ? ";
}
const INSERT_ROWS = createInsertRows();
function ToJson(device) {
    return {
        id: device.id,
        serial: device.serial,
        internal_serial: device.internal_serial,
        type: device.type,
        last_contactair: device.last_contactair,
        last_contactair_index: device.last_contactair_index || 0
    };
}
function ToArrayForInsert(device) {
    return [
        device.serial,
        device.internal_serial,
        device.type,
        device.last_contactair,
        device.last_contactair_index || 0
    ];
}
function manageErrorCrash(error, reject) {
    console.log("Device crash", error);
    pool.manageErrorCrash("Device", error, reject);
}
class DeviceModel extends abstract_js_1.default {
    constructor() {
        super();
    }
    getModelName() {
        return MODEL;
    }
    list() {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM Device ORDER BY id LIMIT 100")
                .then(results => {
                if (!results || results.length == 0)
                    results = [];
                resolve(results);
            })
                .catch(error => {
                manageErrorCrash(error, () => console.log("crashed in list()"));
                resolve([]);
            });
        });
    }
    listDevice() {
        return this.list()
            .then(devices => devices.map(device => ToJson(device)));
    }
    unsetContactair(last_contactair, frame_id) {
        if (!last_contactair)
            last_contactair = "";
        return pool.queryParameters("UPDATE Device SET last_contactair_index = 0, last_contactair = NULL WHERE last_contactair=? AND last_contactair_index < ? ORDER BY id LIMIT 1", [last_contactair, frame_id])
            .then(() => true)
            .catch(error => {
            manageErrorCrash(error, () => console.log("crashed in getDeviceForInternalSerial()"));
            return false;
        });
    }
    setContactairForDevice(last_contactair, internal_serial, frame_id) {
        if (!last_contactair)
            last_contactair = "";
        if (!internal_serial)
            internal_serial = "";
        return new Promise((resolve, reject) => {
            this.unsetContactair(last_contactair, frame_id)
                .then(() => pool.queryParameters("UPDATE Device SET last_contactair_index = ?, last_contactair = ? WHERE internal_serial=? AND last_contactair_index < ? ORDER BY id LIMIT 1", [frame_id, last_contactair, internal_serial, frame_id]))
                .then(() => this.getDeviceForInternalSerial(internal_serial))
                .then(device => resolve(device))
                .catch(error => {
                manageErrorCrash(error, () => console.log("crashed in getDeviceForInternalSerial()"));
                resolve(undefined);
            });
        });
    }
    getDeviceForInternalSerial(internal_serial) {
        if (!internal_serial)
            internal_serial = "";
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM Device WHERE internal_serial=? ORDER BY id LIMIT 1", [internal_serial])
                .then(results => {
                if (!results || results.length == 0)
                    resolve(undefined);
                else
                    resolve(ToJson(results[0]));
            })
                .catch(error => {
                manageErrorCrash(error, () => console.log("crashed in getDeviceForInternalSerial()"));
                resolve(undefined);
            });
        });
    }
    getDeviceForSerial(serial) {
        if (!serial)
            serial = "";
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM Device WHERE serial=? ORDER BY id LIMIT 1", [serial])
                .then(results => {
                if (!results || results.length == 0)
                    resolve(undefined);
                else
                    resolve(ToJson(results[0]));
            })
                .catch(error => {
                manageErrorCrash(error, () => console.log("crashed in getDeviceForSerial()"));
                resolve(undefined);
            });
        });
    }
    getDeviceForContactair(contactair) {
        if (!contactair)
            contactair = "";
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM Device WHERE last_contactair=? ORDER BY id LIMIT 1", [contactair])
                .then(results => {
                if (!results || results.length == 0)
                    resolve(undefined);
                else
                    resolve(ToJson(results[0]));
            })
                .catch(error => {
                manageErrorCrash(error, () => console.log("crashed in getDeviceForSerial()"));
                resolve(undefined);
            });
        });
    }
    saveType(internal_serial, type) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("UPDATE Device SET type_set=1, type=? WHERE internal_serial=? ORDER BY id LIMIT 1", [type, internal_serial])
                .then(results => {
                resolve(true);
            })
                .catch(error => {
                manageErrorCrash(error, () => console.log("crashed in saveType()"));
                resolve(undefined);
            });
        });
    }
    saveDevice(device) {
        return this.saveMultiple([device]).then(devices => {
            console.log("saveDevice", devices);
            if (devices && devices.length > 0)
                return devices[0];
            return undefined;
        });
    }
    saveMultiple(devices) {
        return new Promise((resolve, reject) => {
            var array = [];
            try {
                array = devices.map(device => ToArrayForInsert(device));
            }
            catch (e) {
                console.log(e);
            }
            pool.queryParameters(INSERT_ROWS, [array])
                .then(result => {
                console.log("result", result);
                resolve(devices);
            })
                .catch(error => manageErrorCrash(error, reject));
        });
    }
}
DeviceModel.instance = new DeviceModel();
exports.default = DeviceModel;
//# sourceMappingURL=device_model.js.map