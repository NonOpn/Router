const mysql = require("mysql"),
Abstract = require("../database/abstract.js"),
config = require("../config/mysql.js");

var connection = mysql.createConnection({
  host     : config.host,
  user     : config.user,
  password : config.password,
  database : config.database
});

connection.connect();
connection.query("CREATE TABLE IF NOT EXISTS ConfigRows ("
  + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
  + "`key` VARCHAR(255) NOT NULL,"
  + "`value` TEXT NOT NULL,"
  + "UNIQUE KEY `key` (`key`)"
  + ")ENGINE=MyISAM;", function(err, results, fields) {
    console.log("table creation finished");
});

const MODEL = "ConfigRows";

function createInsertRows() {
  var columns = ["key","value"]
  columns = columns.map(function(col) {
    return "`"+col+"`";
  });
  return "INSERT INTO ConfigRows ("+columns.join(",")+") VALUES ? ";
}

const INSERT_ROWS = createInsertRows();

function txToJson(tx) {
  return {
    key: tx.key,
    value: tx.value
  }
}

function txToArrayForInsert(tx) {
  return [
    tx.key,
    tx.value
  ]
}

class ConfigRows extends Abstract {
  getModelName () {
    return MODEL;
  }

  from(key, value) {
    return {
      key: key,
      value: value
    }
  }

  update(key, value) {
    return new Promise((resolve, reject) => {
      connection.query("UPDATE ConfigRows SET `value` = ? WHERE `key` = ? ", [value, key],  (error, results, fields) => {
        if(error) {
          reject(error);
          return;
        }

        if(results && results.length > 0) {
          resolve(results[0]);
        } else {
          resolve(undefined);
        }
      });
    });
  }

  getKey(key) {
    return new Promise((resolve, reject) => {
      connection.query("SELECT * FROM ConfigRows WHERE `key` = ? ", [key], (error, results, fields) => {
        if(error) {
          reject(error);
          return;
        }

        if(results && results.length > 0) {
          resolve(results[0]);
        } else {
          resolve(undefined);
        }
      });
    });
  }

  save(key, value) {
    return new Promise((resolve, reject) => {
      const tx = this.from(key, value);

      this.getKey(key)
      .then(item => {
        if(item) {
          this.update(key, value)
          .then(result => resolve(result))
          .catch(err => reject(err));
        } else {
          connection.query("INSERT INTO ConfigRows SET ?", tx, (error, results, fields) => {
            if(error && error.code !== "ER_DUP_ENTRY") {
              console.log(tx);
              console.log(error);
              console.log(results);
              console.log(fields);
              reject(error);
            } else {
              resolve(tx);
            }
          });
        }
      })
      .catch(err => reject(err));
    });
  }

}
module.exports = new ConfigRows();
