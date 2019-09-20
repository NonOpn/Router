"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = __importDefault(require("mysql"));
const mysql_js_1 = __importDefault(require("../config/mysql.js"));
class Pool {
    constructor() {
        this.pool = mysql_1.default.createPool({
            connectionLimit: 20,
            host: mysql_js_1.default.host,
            user: mysql_js_1.default.user,
            password: mysql_js_1.default.password,
            database: mysql_js_1.default.database,
            debug: false
        });
    }
    query(query, resolve_if_fail = false) {
        return new Promise((resolve, reject) => {
            this._exec(query, [], resolve, reject, resolve_if_fail);
        });
    }
    queryParameters(query, parameters, resolve_if_fail = false) {
        return new Promise((resolve, reject) => {
            this._exec(query, parameters, resolve, reject, resolve_if_fail);
        });
    }
    repair(request, error, reject) {
        this.pool.query(request, (err, results, fields) => {
            console.log("repairing...", { err });
            reject(error);
        });
    }
    manageErrorCrash(table_name, error, reject) {
        console.log("Manage crash...");
        if (error && error.code === "HA_ERR_NOT_A_TABLE") {
            console.log("not a table... try repair", { error });
            this.repair("REPAIR TABLE " + table_name + " USE_FRM", error, reject);
        }
        else if (error && error.code === "ER_CRASHED_ON_USAGE") {
            console.log("crashed... try repair", { error });
            this.repair("REPAIR TABLE " + table_name, error, reject);
        }
        else {
            reject(error);
        }
    }
    _exec(query, parameters, resolve, reject, resolve_if_fail) {
        this.pool.query(query, parameters, (error, results, fields) => {
            if (error && error.code !== "ER_DUP_ENTRY" && !resolve_if_fail)
                reject(error);
            else
                resolve(results);
        });
    }
}
Pool.instance = new Pool();
exports.default = Pool;
//# sourceMappingURL=pool.js.map