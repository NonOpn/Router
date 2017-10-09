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
connection.query("CREATE TABLE IF NOT EXISTS Frames ("
  + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
  + "`frame` VARCHAR(255) NOT NULL,"
  + "`timestamp` INTEGER NOT NULL,"
  + "`sent` INTEGER NOT NULL,"
  + "KEY `timestamp` (`timestamp`)"
  + ")ENGINE=MyISAM;", function(err, results, fields) {
    console.log("table creation finished");
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

const FrameModel = function() {

}

Abstract.make_inherit(FrameModel);

FrameModel.prototype.getModelName = function() {
  return FRAME_MODEL;
}

FrameModel.prototype.from = function(frame, sent = 0) {
  return {
    timestamp: Math.floor(Date.now()/1000),
    frame: frame,
    sent: sent
  }
}

FrameModel.prototype.setSent = function(id, sent) {
  return new Promise((resolve, reject) => {
    connection.query("UPDATE Frames SET sent = ? WHERE id = ? ", [sent, id],  (error, results, fields) => {
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

FrameModel.prototype.getUnsent = function() {
  return new Promise((resolve, reject) => {
    connection.query("SELECT * FROM Frames WHERE sent = 0 ", (error, results, fields) => {
      if(error) {
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
}

FrameModel.prototype.saveMultiple = function(txs) {
  return new Promise((resolve, reject) => {
    const array = [];

    txs.forEach(transaction => {
      transaction.timestamp = Math.floor(Date.now()/1000);
      array.push(txToArrayForInsert(transaction));
    });

    connection.query(INSERT_ROWS, [array], (error, results, fields) => {
      if(error && error.code !== "ER_DUP_ENTRY") {
        console.log(error);
        console.log(results);
        console.log(fields);
        reject(error);
      } else {
        resolve(txs);
      }
    });
  });
}

FrameModel.prototype.save = function(tx) {
  return new Promise((resolve, reject) => {
    tx.timestamp = Math.floor(Date.now()/1000);
    const transaction = txToJson(tx);
    connection.query("INSERT INTO Frames SET ?", transaction, (error, results, fields) => {
      if(error && error.code !== "ER_DUP_ENTRY") {
        console.log(tx);
        console.log(error);
        console.log(results);
        console.log(fields);
        reject(error);
      } else {
        resolve(transaction);
      }
    });
  });
}

module.exports = new FrameModel();
