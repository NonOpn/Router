import mysql from "mysql";
import config from "../../config/mysql.js";
import { Resolve, Reject } from "../promise.jsx";

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

  manageErrorCrash(table_name: string, error: any, reject: Reject): void {
    console.log("Manage crash", {error});
    if(error && error.code === "HA_ERR_NOT_A_TABLE") {
      this.pool.query("REPAIR TABLE " + table_name)
      .then(() => reject(error))
      .catch(() => reject(error));
    } else if(error && error.code === "ER_CRASHED_ON_USAGE") {
      this.pool.query("REPAIR TABLE " + table_name)
      .then(() => reject(error))
      .catch(() => reject(error));
    } else {
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