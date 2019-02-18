const mysql = require("mysql"),
config = require("../config/mysql.js");

var pool = mysql.createPool({
  connectionLimit: 20,
  host     : config.host,
  user     : config.user,
  password : config.password,
  database : config.database,
  debug: false
});

function exec(query, parameters, resolve, reject, resolve_if_fail) {
  pool.query(query, parameters, (error, results, fields) => {
    if(error && error.code !== "ER_DUP_ENTRY" && !resolve_if_fail) reject(error);
    else resolve(results);
  });
}

module.exports = {
  query: (query, resolve_if_fail) => {
    return new Promise((resolve, reject) => {
      exec(query, [], resolve, reject, resolve_if_fail);
    });
  },
  queryParameters: (query, parameters, resolve_if_fail) => {
    return new Promise((resolve, reject) => {
      exec(query, parameters, resolve, reject, resolve_if_fail);
    });
  },
  manageErrorCrash: (table_name, error, reject) => {
    if(error && error.code === "ER_CRASHED_ON_USAGE") {
      pool.query("REPAIR TABLE " + table_name)
      .then(result => reject(error))
      .catch(err => reject(error));
    } else {
      reject(error);
    }
  }
}
