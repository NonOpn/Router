"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = __importDefault(require("mysql"));
const mysql_js_1 = __importDefault(require("../config/mysql.js"));
const index_js_1 = require("../log/index.js");
const systemctl_1 = require("../systemctl");
class Pool {
    constructor() {
        this.mysql = new systemctl_1.MySQL();
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
        console.log("Manage crash... " + (error ? error.code : "error no code"));
        if (error && error.code === "HA_ERR_NOT_A_TABLE") {
            console.log("not a table... try repair", { error });
            this.repair("REPAIR TABLE " + table_name + " USE_FRM", error, reject);
            index_js_1.Logger.data({ repair: table_name, use_frm: true });
        }
        else if (error && error.code === "ER_CRASHED_ON_USAGE") {
            console.log("crashed... try repair", { error });
            this.repair("REPAIR TABLE " + table_name, error, reject);
            index_js_1.Logger.data({ repair: table_name });
        }
        else if (error && error.code === "ECONNREFUSED") {
            console.log("trying starting...", { error });
            //restart the MySQL instance if possible and report the state
            const callback = (done) => { index_js_1.Logger.data({ restart: "mysql", done }); reject(error); };
            this.mysql.restart().then(() => callback(true))
                .catch(err => {
                callback(false);
                reject(error);
            });
        }
        else {
            index_js_1.Logger.error(error);
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