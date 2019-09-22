import mysql from "mysql";
import config from "../config/mysql.js";
import { Resolve, Reject } from "../promise.jsx";
import { Logger } from "../log/index.js";

export default class Pool {
  static instance: Pool = new Pool();

  pool: any;

  constructor() {
    this.pool = mysql.createPool({
      connectionLimit: 20,
      host     : config.host,
      user     : config.user,
      password : config.password,
      database : config.database,
      debug: false
    });
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
    } else {
      Logger.error(error);
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