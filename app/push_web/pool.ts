import mysql from "mysql";
import config from "../config/mysql.js";
import { Resolve, Reject } from "../promise.jsx";
import { Logger } from "../log/index.js";
import { MySQL, Cat, MysqlAdmin } from "../systemctl";

export default class Pool {
  static instance: Pool = new Pool();

  pool: any;

  mysql: MySQL;
  mysqladmin: MysqlAdmin;

  sent_mysql_status: number;

  constructor() {
    this.sent_mysql_status = 0;
    this.mysql = new MySQL();
    this.mysqladmin = new MysqlAdmin();
    this.pool = mysql.createPool({
      connectionLimit: 20,
      host     : config.host,
      user     : config.user,
      password : config.password,
      database : config.database,
      debug: false
    });
  }

  trySendMysqlStatus() {
    return new Promise((resolve) => {
      this.sent_mysql_status --;

      if(this.sent_mysql_status <= 0) {
        this.mysql.status()
        .then(status => {
          console.log("mysql status := ");
          console.log(status);
          Logger.identity({from: "trySendMysqlStatus", mysql: status});
          this.sent_mysql_status = 10;
          resolve();
        })
        .catch(err => {
          console.error(err);
          this.sent_mysql_status = 10;
          resolve();
        });
      } else {
        resolve();
      }
    })
  }

  query(query: string, resolve_if_fail: boolean = false): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this._exec(query, [], resolve, reject, resolve_if_fail);
    });
  }

  queryParameters(query: string, parameters: any[], resolve_if_fail: boolean = false): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this._exec(query, parameters, resolve, reject, resolve_if_fail);
    });
  }

  repair(request: string, error: any, reject: Reject) {
    this.pool.query(request, (err: any, results: any[], fields: any[]) => {
      console.log("repairing...", {err});
      reject(error);
    })
  }

  manageErrorCrash(table_name: string, error: any, reject: Reject): void {
    console.log("Manage crash... " + (error ? error.code : "error no code"));
    if(error && error.code === "HA_ERR_NOT_A_TABLE") {
      console.log("not a table... try repair", {error});
      this.repair("REPAIR TABLE " + table_name + " USE_FRM", error, reject);
      Logger.data({repair: table_name, use_frm: true});
    } else if(error && error.code === "ER_CRASHED_ON_USAGE") {
      console.log("crashed... try repair", {error});
      this.repair("REPAIR TABLE " + table_name, error, reject);
      Logger.data({repair: table_name});
    } else if(error && error.code === "ECONNREFUSED") {
      console.log("trying starting...", {error});
      //send status to see what happens
      this.trySendMysqlStatus()
      .then(() => {
        //restart the MySQL instance if possible and report the state
        const callback = (done: boolean) => { Logger.data({restart: "mysql", done}); reject(error); }
        this.mysql.restart().then(() => callback(true))
        .catch(err => {
          callback(false);
          reject(error);
        });
      })
    } else if(error && error.code == "ER_CON_COUNT_ERROR") {
      console.log("maximum host reached, flushing...", {error});
      //restart the MySQL instance if possible and report the state
      const callback = (done: boolean) => { Logger.identity({max_connection: "max", restart: "mysql", done}); reject(error); }
      this.mysqladmin.exec("flush-hosts", config.user || "", config.password || "")
      .then(() => {
        Logger.identity({max_connection: "max", done: "flush-hosts"}); reject(error);
        console.log("flush-hosts done, will also flush cat");
        new Cat().exec("/etc/mysql/my.cnf").then(content => Logger.identity({content})).catch(err => {});

        return this.mysql.restart()
      })
      .then(() => callback(true))
      .catch(err => {
        callback(false);
        reject(error);
      });
    } else {
      Logger.error(error, "in pool call for table := " + table_name);

      new Cat().exec("/etc/mysql/my.cnf").then(content => Logger.identity({content})).catch(err => {});
      reject(error);
    }
  }

  _exec(query: string, parameters: any[], resolve: Resolve, reject: Reject, resolve_if_fail: boolean) {
    this.pool.query(query, parameters, (error: any, results: any[], fields: any[]) => {
      if(error && error.code !== "ER_DUP_ENTRY" && !resolve_if_fail) reject(error);
      else resolve(results);
    });
  }
}