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

var pool = mysql.createPool({
  connectionLimit: 20,
  host     : config.host,
  user     : config.user,
  password : config.password,
  database : config.database,
  debug: false
});

pool.getConnection((err, connection) => {
  connection.query("CREATE TABLE IF NOT EXISTS Frames ("
    + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
    + "`frame` VARCHAR(255) NOT NULL,"
    + "`timestamp` INTEGER NOT NULL,"
    + "`sent` INTEGER NOT NULL,"
    + "KEY `timestamp` (`timestamp`)"
    + ")ENGINE=MyISAM;", function(err, results, fields) {
      connection.release();
      console.log("table creation finished");
  });
});

const FRAME_MODEL = "Transaction";

function createInsertRows() {
  var columns = ["frame","timestamp","sent"]
  columns = columns.map(function(col) {
    return "`"+col+"`";
  });
  return "INSERT INTO Frames ("+columns.join(",")+") VALUES ? ";
}

const INSERT_ROWS = createInsertRows();

function txToJson(tx) {
  return {
    frame: tx.frame,
    timestamp: tx.timestamp,
    sent: tx.sent
  }
}

function txToArrayForInsert(tx) {
  return [
    tx.frame,
    tx.timestamp,
    tx.sent
  ]
}

class FrameModel extends Abstract {
  constructor() {
    super();
  }

  getModelName() {
    return FRAME_MODEL;
  }

  from(frame, sent = 0) {
    return {
      timestamp: Math.floor(Date.now()/1000),
      frame: frame,
      sent: sent
    }
  }

  manageErrorCrash(resolve, reject) {
    pool.getConnection((err, connection) => {
      if(!connection) {
        reject(err)
        return;
      }
      connection.query("REPAIR TABLE Frames", (error, results, fields) => {
        connection.release();
        console.log(error);
        console.log(results);
        console.log(fields);
        reject(error);
      });
    });
  }

  setSent(id, sent) {
    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if(!connection) {
          reject(err)
          return;
        }
        connection.query("UPDATE Frames SET sent = ? WHERE id = ? ", [sent, id],  (error, results, fields) => {
          connection.release();
          if(error && error.code === "ER_CRASHED_ON_USAGE") {
            this.manageErrorCrash(resolve, reject);
            return;
          } else if(error) {
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
    });
  }

  before(timestamp) {
    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if(!connection) {
          reject(err)
          return;
        }
        console.log(timestamp);
        connection.query("SELECT * FROM Frames WHERE timestamp < ? ORDER BY timestamp LIMIT 100", [timestamp], (error, results, fields) => {
          connection.release();
          if(error && error.code === "ER_CRASHED_ON_USAGE") {
            this.manageErrorCrash(resolve, reject);
            return;
          } else if(error) {
            reject(error);
            return;
          }

          if(results && results.length > 0) {
            resolve(results);
          } else {
            resolve([]);
          }
        });
      });
    });
  }

  getUnsent() {
    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if(!connection) {
          reject(err)
          return;
        }
        connection.query("SELECT * FROM Frames WHERE sent = 0 LIMIT 100", (error, results, fields) => {
          connection.release();
          if(error && error.code === "ER_CRASHED_ON_USAGE") {
            this.manageErrorCrash(resolve, reject);
            return;
          } else if(error) {
            reject(error);
            return;
          }

          if(results && results.length > 0) {
            resolve(results);
          } else {
            resolve([]);
          }
        });
      });
    });
  }

  saveMultiple(txs) {
    return new Promise((resolve, reject) => {
      const array = [];

      try {
        txs.forEach(transaction => {
          transaction.timestamp = Math.floor(Date.now()/1000);
          array.push(txToArrayForInsert(transaction));
        });
      } catch(e) {

      }

      pool.getConnection((err, connection) => {
        if(!connection) {
          reject(err)
          return;
        }
        connection.query(INSERT_ROWS, [array], (error, results, fields) => {
          connection.release();
          if(error && error.code !== "ER_DUP_ENTRY") {
            if(error && error.code === "ER_CRASHED_ON_USAGE") {
              this.manageErrorCrash(resolve, reject);
            } else {
              console.log(error);
              console.log(results);
              console.log(fields);
              reject(error);
            }
          } else {
            resolve(txs);
          }
        });
    });
    });
  }

  save(tx) {
    return new Promise((resolve, reject) => {
      tx.timestamp = Math.floor(Date.now()/1000);
      const transaction = txToJson(tx);
      pool.getConnection((err, connection) => {
        if(!connection) {
          reject(err)
          return;
        }
        connection.query("INSERT INTO Frames SET ?", transaction, (error, results, fields) => {
          connection.release();
          if(error && error.code !== "ER_DUP_ENTRY") {
            if(error && error.code === "ER_CRASHED_ON_USAGE") {
              this.manageErrorCrash(resolve, reject);
            } else {
              console.log(tx);
              console.log(error);
              console.log(results);
              console.log(fields);
              reject(error);
            }
          } else {
            resolve(transaction);
          }
        });
      });
    });
  }

}
module.exports = new FrameModel();
