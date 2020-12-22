import mysql from "mysql";
import config from "../config/mysql.js";
import { Resolve, Reject } from "../promise.jsx";
import { Logger } from "../log/index.js";
import { MySQL, Cat, MysqlAdmin } from "../systemctl";
import { networkInterfaces } from "os";
import NetworkInfo from "../network/index.js";

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
      host     : config.host || "",
      user     : config.user || "",
      password : config.password || "",
      database : config.database || "",
      debug: false
    });
  }

  trySendMysqlStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      this.sent_mysql_status --;

      if(this.sent_mysql_status <= 0) {
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
      } else {
        resolve(false);
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

  log(data: any) {
    if(!NetworkInfo.instance.isGPRS()) {
      Logger.data({context: "pool", ...data});
    }
  }

  manageErrorCrash(table_name: string, error: any, reject: Reject, callback?: () => Promise<any>): void {
    console.log("Manage crash... " + (error ? error.code : "error no code"));
    if(!NetworkInfo.instance.isGPRS()) {
      Logger.error(error, "error_for " + table_name);
    }

    if(table_name && table_name.toLowerCase() == "device" && error && error.errno == 144) {
      //safe to assume resetting the devices here :thumbsup:
      this.repair("TRUNCATE TABLE Device", error, reject);
    } else if(error && error.code === "HA_ERR_NOT_A_TABLE") {
      console.log("not a table... try repair", {error});
      this.repair("REPAIR TABLE " + table_name + " USE_FRM", error, reject);
      this.log({repair: table_name, use_frm: true});
    } else if(error && error.code === "ER_FILE_NOT_FOUND") {
      console.log("crashed on interaction... try repair", {error});
      this.repair("REPAIR TABLE " + table_name + " USE_FRM", error, (error) => {
        const promise = callback ? callback() : Promise.resolve(true);

        promise.then(() => reject(error)).catch(() => reject(error));
      });
      this.log({repair: table_name});
    } else if(error && error.code === "HA_ERR_CRASHED_ON_REPAIR") {
      console.log("crashed on auto repair... try repair", {error});
      this.repair("REPAIR TABLE " + table_name + " USE_FRM", error, reject);
      this.log({repair: table_name});
    } else if(error && error.code === "ER_CRASHED_ON_USAGE") {
      console.log("crashed... try repair", {error});
      this.repair("REPAIR TABLE " + table_name, error, reject);
      this.log({repair: table_name});
    } else if(error && error.code === "ECONNREFUSED") {
      console.log("trying starting...", {error});
      //send status to see what happens
      this.trySendMysqlStatus()
      .then(can_be_done => {
        if(can_be_done) {
          //restart the MySQL instance if possible and report the state
          const callback = () => reject(error);
          this.mysql.restart().then(() => callback())
          .catch(() => callback());
        }
      })
    } else if(error && error.code == "ER_CON_COUNT_ERROR") {
      console.log("maximum host reached, flushing...", {error});
      //restart the MySQL instance if possible and report the state
      const callback = () => reject(error);
      this.mysqladmin.exec("flush-hosts", config.user || "", config.password || "")
      .then(() => {
        reject(error);
        new Cat().exec("/etc/mysql/my.cnf").catch(err => {});

        return this.mysql.restart()
      })
      .then(() => callback())
      .catch(() => callback());
    } else {
      //Logger.error(error, "in pool call for table := " + table_name);

      this.tryPostingSQLState();
      reject(error);
    }
  }

  private can_post_error: boolean = true;
  private tryPostingSQLState() {
    if(this.can_post_error && !NetworkInfo.instance.list().find(i => i.name === "eth1")) {
      this.can_post_error = false;

      new Cat().exec("/etc/mysql/my.cnf").catch(err => {});

      //allow in 10min
      setTimeout(() => this.can_post_error = true, 10 * 60 * 1000);
    }
  }

  _exec(query: string, parameters: any[], resolve: Resolve, reject: Reject, resolve_if_fail: boolean) {
    try {
      this.pool.query(query, parameters, (error: any, results: any[], fields: any[]) => {
        if(error && error.code !== "ER_DUP_ENTRY" && !resolve_if_fail) reject(error);
        else resolve(results);
      });
    } catch(e) {
      reject(e);
    }
  }
}