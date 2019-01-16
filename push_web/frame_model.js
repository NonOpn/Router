const pool = require("./pool"),
Abstract = require("../database/abstract.js"),
config = require("../config/mysql.js");

pool.query("CREATE TABLE IF NOT EXISTS Frames ("
  + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
  + "`frame` VARCHAR(255) NOT NULL,"
  + "`timestamp` INTEGER NOT NULL,"
  + "`sent` INTEGER NOT NULL,"
  + "`product_id` INTEGER,"
  + "`striken` TINYINT(1) DEFAULT 0,"
  + "`connected` TINYINT(1) DEFAULT 0,"
  + "KEY `timestamp` (`timestamp`)"
  + ")ENGINE=MyISAM;")
.then(results => pool.query("ALTER TABLE Frames ADD COLUMN `product_id` INTEGER", true))
.then(results => pool.query("ALTER TABLE Frames ADD COLUMN `striken` INTEGER", true))
.then(results => pool.query("ALTER TABLE Frames ADD COLUMN `connected` INTEGER", true))
.then(results => pool.query("ALTER TABLE Frames ADD INDEX `product_id` (`product_id`);", true))
.then(results => pool.query("ALTER TABLE Frames ADD INDEX `striken` (`striken`);", true))
.then(results => pool.query("ALTER TABLE Frames ADD INDEX `connected` (`connected`);", true))
.then(results => console.log("finished"))
.catch(err => console.log(err));

const FRAME_MODEL = "Transaction";

function createInsertRows() {
  var columns = ["frame","timestamp","sent"]
  columns = columns.map(col => "`"+col+"`");
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

function manageErrorCrash(error, reject) {
  pool.manageErrorCrash("Frames", error, reject);
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

  setSent(id, sent) {
    return new Promise((resolve, reject) => {
      pool.queryParameters("UPDATE Frames SET sent = ? WHERE id = ? ", [sent, id])
      .then(results => {
        if(results && results.length > 0) resolve(results[0]);
        else resolve(undefined);
      })
      .catch(err => manageErrorCrash(err, reject));
    });
  }

  hasData(device/*.id*/, timestamp_in_past) {
    var append = "";
    if(timestamp_in_past) append = "AND timestamp > ?";
    return new Promise((resolve, reject) => {
      console.log(timestamp);
      pool.queryParameters("SELECT COUNT(*) FROM Frames WHERE product_id = ? "+append+" ORDER BY timestamp LIMIT 100",
      [device.id, timestamp_in_past])
      .then(results => resolve(results))
      .catch(err => manageErrorCrash(err, reject));
    });
  }

  beforeForDevice(device/*.id*/, timestamp) {
    return new Promise((resolve, reject) => {
      pool.queryParameters("SELECT * FROM Frames WHERE product_id = ? AND timestamp < ? ORDER BY timestamp LIMIT 100",
      [device.id, timestamp])
      .then(results => resolve(results))
      .catch(err => manageErrorCrash(err, reject));
    });
  }

  before(timestamp) {
    return new Promise((resolve, reject) => {
      console.log(timestamp);
      pool.queryParameters("SELECT * FROM Frames WHERE timestamp < ? ORDER BY timestamp LIMIT 100", [timestamp])
      .then(results => resolve(results))
      .catch(err => manageErrorCrash(err, reject));
    });
  }

  getUnsent() {
    return new Promise((resolve, reject) => {
      pool.query("SELECT * FROM Frames WHERE sent = 0 LIMIT 100")
      .then(results => resolve(results))
      .catch(err => manageErrorCrash(err, reject));
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

      pool.queryParameters(INSERT_ROWS, [array])
      .then(results => resolve(txs))
      .catch(err => manageErrorCrash(err, reject));
    });
  }

  save(tx) {
    return new Promise((resolve, reject) => {
      tx.timestamp = Math.floor(Date.now()/1000);
      const transaction = txToJson(tx);
      pool.queryParameters("INSERT INTO Frames SET ?", [transaction])
      .then(results => resolve(transaction))
      .catch(err => manageErrorCrash(err, reject));
    });
  }

}
module.exports = new FrameModel();
