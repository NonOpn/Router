import { Device } from './device_model';
import Pool from "./pool";
import Abstract from "../database/abstract.js";
import { Reject } from "../promise";

const pool: Pool = Pool.instance;

pool.query("CREATE TABLE IF NOT EXISTS FramesCompress ("
  + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
  + "`original_id` INT NULL UNIQUE,"
  + "`frame` VARCHAR(255) NOT NULL,"
  + "`timestamp` INTEGER NOT NULL,"
  + "`sent` INTEGER NOT NULL,"
  + "`product_id` INTEGER,"
  + "`striken` TINYINT(1) DEFAULT 0,"
  + "`connected` TINYINT(1) DEFAULT 0,"
  + "`is_alert` TINYINT(1) DEFAULT NULL,"
  + "KEY `timestamp` (`timestamp`)"
  + ")ENGINE=MyISAM;")
.then(() => pool.query("ALTER TABLE FramesCompress ADD COLUMN `product_id` INTEGER", true))
.then(() => pool.query("ALTER TABLE FramesCompress ADD COLUMN `striken` INTEGER", true))
.then(() => pool.query("ALTER TABLE FramesCompress ADD COLUMN `connected` INTEGER", true))
.then(() => pool.query("ALTER TABLE FramesCompress ADD COLUMN `is_alert` TINYINT(1) DEFAULT NULL", true))
.then(() => pool.query("ALTER TABLE FramesCompress ADD INDEX `product_id` (`product_id`);", true))
.then(() => pool.query("ALTER TABLE FramesCompress ADD INDEX `striken` (`striken`);", true))
.then(() => pool.query("ALTER TABLE FramesCompress ADD INDEX `connected` (`connected`);", true))
.then(() => pool.query("ALTER TABLE FramesCompress ADD INDEX `is_alert` (`is_alert`);", true))
.then(() => console.log("finished"))
.catch(err => console.log(err));

const FRAME_MODEL: string = "Transaction";

function createInsertRows(): string {
  var columns = ["frame","timestamp","sent"]
  columns = columns.map(col => "`"+col+"`");
  return "INSERT INTO FramesCompress ("+columns.join(",")+") VALUES ? ";
}

const INSERT_ROWS = createInsertRows();

export interface Transaction {
  id?: number;
  frame: string;
  timestamp: number;
  sent: number; //0/1
}

function txToJson(tx: Transaction): Transaction{
  return {
    frame: tx.frame,
    timestamp: tx.timestamp,
    sent: tx.sent
  }
}

function txToArrayForInsert(tx: Transaction): any[] {
  return [
    tx.frame,
    tx.timestamp,
    tx.sent
  ]
}

function manageErrorCrash(error: Error, reject: Reject) {
  pool.manageErrorCrash("FramesCompress", error, reject);
}

export default class FrameModelCompress extends Abstract {
  static instance: FrameModelCompress = new FrameModelCompress();
  
  constructor() {
    super();
  }

  getModelName() {
    return FRAME_MODEL;
  }

  hasData(device: Device, timestamp_in_past: number): Promise<any[]> {
    var append = "";
    if(timestamp_in_past) append = "AND timestamp > ?";
    return new Promise((resolve, reject) => {
      pool.queryParameters("SELECT COUNT(*) FROM FramesCompress WHERE product_id = ? "+append+" ORDER BY timestamp LIMIT 100",
      [device.id, timestamp_in_past])
      .then(results => resolve(results))
      .catch(err => manageErrorCrash(err, reject));
    });
  }

  invalidateAlerts(product_id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      console.log("set is_alert = null where id", product_id);
      pool.queryParameters("UPDATE FramesCompress SET is_alert = NULL WHERE product_id = ? AND is_alert IS NOT NULL", [product_id])
      .then(results => resolve(true))
      .catch(err => manageErrorCrash(err, reject));
    });
  }

  getRelevantByte(frame: string) {
    var compressed = this.getCompressedFrame(frame);
    if(compressed && compressed.length > 0) {
      return compressed.slice(-2);
    }
    return "00";
  }
  //ffffff - ffffff0000000b - 01824a - 995a01
  getCompressedFrame(frame: string) {
    if(frame && frame.length > 14+20+8)
      return frame.substring(14+6, 14+20);
    return frame;
  }

  getInternalSerial(frame: string) {
    return frame.substring(14+0, 14+6);
  }

  getContactair(frame: string) {
    //ffffffffffff0000000b01824a995a01
    if(frame.length > 14+20+8)
      return frame.substring(14+20, 14+20+8)
    return "";
  }

  getMinFrame(): Promise<number> {
    return new Promise((resolve, reject) => {
      pool.query("SELECT MIN(id) as m FROM FramesCompress")
      .then(result => {
        var index = 0;
        if(result && result.length > 0) index = result[0].m;
        console.log("getMinFrame", result);
        resolve(index);
      })
      .catch(err => manageErrorCrash(err, reject));
    })
  }

  getMaxFrame(): Promise<number> {
    return new Promise((resolve, reject) => {
      pool.query("SELECT MAX(id) as m FROM FramesCompress")
      .then(result => {
        var index = 0;
        if(result && result.length > 0) index = result[0].m;
        console.log("getMaxFrame", result);
        resolve(index);
      })
      .catch(err => manageErrorCrash(err, reject));
    })
  }

  getFrame(index: number, limit: number): Promise<Transaction[]|undefined> {
    return new Promise((resolve, reject) => {
      pool.queryParameters("SELECT * FROM FramesCompress WHERE id >= ? ORDER BY id LIMIT ?", [index, limit])
      .then(results => results && results.length > 0 ? resolve(results) : resolve(undefined))
      .catch(err => manageErrorCrash(err, reject));
    });
  }

  _contactair_cache = [];
  _syncing = false;
  _temp_syncing: any[] = [];

  start() {
    if(!this._syncing) {
      console.log("start migrating...");
      this._syncing = true;
      var index = 0;

      var callback = (from: number) => {
        pool.queryParameters("SELECT * FROM Frames WHERE id >= ? ORDER BY id LIMIT 500", [from])
        .then((results: Transaction[]|undefined) => {
          if(results && results.length > 0) {
            var subcall = (idx:number) => {
              if(idx >= results.length) {
                callback(index+1);
              } else {
                const transaction = results[idx];
                if(transaction.id && transaction.id > index) index = transaction.id;
  
                this.save(transaction, true)
                .then(saved => subcall(idx+1))
                .catch(err => subcall(idx+1));
              }
            }
            subcall(0);
          } else {
            this.flushAwaiting();
          }
        })
        .catch(err => manageErrorCrash(err, () => {}));
      }
      callback(0);
    }
  }

  flushAwaiting() {
    var callback = (index: number) => {
      if(index > this._temp_syncing.length) {
        const resolve = this._temp_syncing[index].resolve;
        const reject = this._temp_syncing[index].reject;
        const transaction = this._temp_syncing[index].transaction;

        this.save(transaction, true)
        .then(saved => {
          resolve(saved);
          callback(index+1);
        })
        .catch(err => {
          reject(err);
          callback(index+1)
        });
      } else {
        //done
        this._syncing = false;
      }
    }
    callback(0);
  }

  save(tx: Transaction, force: boolean = false): Promise<Transaction> {
    return new Promise((resolve, reject) => {
      if(this._syncing && !force) {
        this._temp_syncing.push({resolve, reject, transaction: tx})
        return;
      }

      const contactair = this.getContactair(tx.frame);
      const data = this.getRelevantByte(tx.frame);
      var cache: any = {data: null, timeout: 11};

      //console.log("managing frame := " + contactair+" data:="+data);

      if(!this._contactair_cache[contactair]) {
        this._contactair_cache[contactair] = cache;
      } else {
        cache = this._contactair_cache[contactair];
      }

      tx.timestamp = Math.floor(Date.now()/1000);
      const transaction:any = txToJson(tx);
      if(tx.id) transaction.original_id = tx.id;

      cache.timeout --;

      if(cache.data && cache.data == data && cache.timeout > 0) {
        //now set the new cache for this round
        this._contactair_cache[contactair] = cache;
        //console.log("don't save the frame for " + contactair + " already known for this round, remaining " + cache.timeout);
        resolve(transaction);
        return
      }

      //the frame can be saved
      cache.data = data;
      cache.timeout = 30;
      this._contactair_cache[contactair] = cache;

      pool.queryParameters("INSERT INTO FramesCompress SET ?", [transaction])
      .then(() => resolve(transaction))
      .catch(err => manageErrorCrash(err, reject));
    });
  }

}
