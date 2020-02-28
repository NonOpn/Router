"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = __importDefault(require("../push_web/pool"));
const abstract_js_1 = __importDefault(require("../database/abstract.js"));
const pool = pool_1.default.instance;
pool.query("CREATE TABLE IF NOT EXISTS ConfigRows ("
    + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
    + "`key` VARCHAR(255) NOT NULL,"
    + "`value` TEXT NOT NULL,"
    + "UNIQUE KEY `key` (`key`)"
    + ")ENGINE=MyISAM;")
    .then(() => console.log("table creation finished"));
const MODEL = "ConfigRows";
function createInsertRows() {
    var columns = ["key", "value"];
    columns = columns.map(function (col) {
        return "`" + col + "`";
    });
    return "INSERT INTO ConfigRows (" + columns.join(",") + ") VALUES ? ";
}
const INSERT_ROWS = createInsertRows();
class ConfigRows extends abstract_js_1.default {
    getModelName() {
        return MODEL;
    }
    array(key, value) {
        return [
            key,
            value
        ];
    }
    from(key, value) {
        return {
            key: key,
            value: value
        };
    }
    update(key, value) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("UPDATE ConfigRows SET `value` = ? WHERE `key` = ? ", [value, key])
                .then(results => resolve(results && results.length > 0 ? results[0] : undefined))
                .catch(err => reject(err));
        });
    }
    getKey(key) {
        return new Promise((resolve, reject) => {
            pool.queryParameters("SELECT * FROM ConfigRows WHERE `key` = ? ", [key])
                .then(results => resolve(results && results.length > 0 ? results[0] : undefined))
                .catch(err => reject(err));
        });
    }
    save(key, value) {
        return new Promise((resolve, reject) => {
            const tx = this.from(key, value);
            this.getKey(key)
                .then(item => {
                if (item) {
                    this.update(key, value)
                        .then(result => resolve(result))
                        .catch(err => reject(err));
                }
                else {
                    pool.queryParameters("INSERT INTO ConfigRows SET ?", [this.array(key, value)])
                        .then(() => resolve({ key, value }))
                        .catch(err => reject(err)); //TODO standardize pool error management
                }
            })
                .catch(err => reject(err));
        });
    }
}
exports.default = ConfigRows;
//# sourceMappingURL=config_rows.js.map