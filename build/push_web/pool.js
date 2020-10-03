"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = __importDefault(require("mysql"));
const mysql_js_1 = __importDefault(require("../config/mysql.js"));
const index_js_1 = require("../log/index.js");
const systemctl_1 = require("../systemctl");
const index_js_2 = __importDefault(require("../network/index.js"));
class Pool {
    constructor() {
        this.can_post_error = true;
        this.sent_mysql_status = 0;
        this.mysql = new systemctl_1.MySQL();
        this.mysqladmin = new systemctl_1.MysqlAdmin();
        this.pool = mysql_1.default.createPool({
            connectionLimit: 20,
            host: mysql_js_1.default.host || "",
            user: mysql_js_1.default.user || "",
            password: mysql_js_1.default.password || "",
            database: mysql_js_1.default.database || "",
            debug: false
        });
    }
    trySendMysqlStatus() {
        return new Promise((resolve) => {
            this.sent_mysql_status--;
            if (this.sent_mysql_status <= 0) {
                this.mysql.status()
                    .then(() => {
                    this.sent_mysql_status = 20;
                    resolve(true);
                })
                    .catch(err => {
                    console.error(err);
                    this.sent_mysql_status = 20;
                    resolve(true);
                });
            }
            else {
                resolve(false);
            }
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
    manageErrorCrash(table_name, error, reject, callback) {
        console.log("Manage crash... " + (error ? error.code : "error no code"));
        if (table_name && table_name.toLowerCase() == "device" && error && error.errno == 144) {
            //safe to assume resetting the devices here :thumbsup:
            this.repair("TRUNCATE TABLE Device", error, reject);
        }
        else if (error && error.code === "HA_ERR_NOT_A_TABLE") {
            console.log("not a table... try repair", { error });
            this.repair("REPAIR TABLE " + table_name + " USE_FRM", error, reject);
            if (!index_js_2.default.instance.isGPRS()) {
                index_js_1.Logger.data({ repair: table_name, use_frm: true });
            }
        }
        else if (error && error.code === "ER_FILE_NOT_FOUND") {
            console.log("crashed on interaction... try repair", { error });
            this.repair("REPAIR TABLE " + table_name + " USE_FRM", error, (error) => {
                const promise = callback ? callback() : Promise.resolve(true);
                promise.then(() => reject(error)).catch(() => reject(error));
            });
            if (!index_js_2.default.instance.isGPRS()) {
                index_js_1.Logger.data({ repair: table_name });
            }
        }
        else if (error && error.code === "HA_ERR_CRASHED_ON_REPAIR") {
            console.log("crashed on auto repair... try repair", { error });
            this.repair("REPAIR TABLE " + table_name + " USE_FRM", error, reject);
            if (!index_js_2.default.instance.isGPRS()) {
                index_js_1.Logger.data({ repair: table_name });
            }
        }
        else if (error && error.code === "ER_CRASHED_ON_USAGE") {
            console.log("crashed... try repair", { error });
            this.repair("REPAIR TABLE " + table_name, error, reject);
            if (!index_js_2.default.instance.isGPRS()) {
                index_js_1.Logger.data({ repair: table_name });
            }
        }
        else if (error && error.code === "ECONNREFUSED") {
            console.log("trying starting...", { error });
            //send status to see what happens
            this.trySendMysqlStatus()
                .then(can_be_done => {
                if (can_be_done) {
                    //restart the MySQL instance if possible and report the state
                    const callback = () => reject(error);
                    this.mysql.restart().then(() => callback())
                        .catch(() => callback());
                }
            });
        }
        else if (error && error.code == "ER_CON_COUNT_ERROR") {
            console.log("maximum host reached, flushing...", { error });
            //restart the MySQL instance if possible and report the state
            const callback = () => reject(error);
            this.mysqladmin.exec("flush-hosts", mysql_js_1.default.user || "", mysql_js_1.default.password || "")
                .then(() => {
                reject(error);
                new systemctl_1.Cat().exec("/etc/mysql/my.cnf").catch(err => { });
                return this.mysql.restart();
            })
                .then(() => callback())
                .catch(() => callback());
        }
        else {
            //Logger.error(error, "in pool call for table := " + table_name);
            this.tryPostingSQLState();
            reject(error);
        }
    }
    tryPostingSQLState() {
        if (this.can_post_error && !index_js_2.default.instance.list().find(i => i.name === "eth1")) {
            this.can_post_error = false;
            new systemctl_1.Cat().exec("/etc/mysql/my.cnf").catch(err => { });
            //allow in 10min
            setTimeout(() => this.can_post_error = true, 10 * 60 * 1000);
        }
    }
    _exec(query, parameters, resolve, reject, resolve_if_fail) {
        try {
            this.pool.query(query, parameters, (error, results, fields) => {
                if (error && error.code !== "ER_DUP_ENTRY" && !resolve_if_fail)
                    reject(error);
                else
                    resolve(results);
            });
        }
        catch (e) {
            reject(e);
        }
    }
}
exports.default = Pool;
Pool.instance = new Pool();
//# sourceMappingURL=pool.js.map