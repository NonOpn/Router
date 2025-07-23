import Pool from "../push_web/pool";

const pool: Pool = Pool.instance;

pool.query("CREATE TABLE IF NOT EXISTS DataPoint ("
  + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
  + "`serial` VARCHAR(255) NOT NULL,"
  + "`internal` VARCHAR(255) NOT NULL,"
  + "`contactair` VARCHAR(255) NOT NULL,"
  + "`enocean_relay` VARCHAR(255) NOT NULL,"
  + "`data` VARCHAR(255) NOT NULL,"
  + "`created_at` INTEGER NOT NULL"
  + ")ENGINE=MyISAM;")
.then(() => console.log("table creation finished"));

export interface DataPointModel {
  id?: number,
  serial: string;
  internal: string;
  contactair: string;
  enocean_relay: string;
  data: string;
  created_at: Date;
}

export default class DataPoint {
  static instance: DataPoint = new DataPoint();
  
  constructor() {

  }

  savePoint(serial: string, internal: string, contactair: string, data: string): Promise<DataPointModel> {
    return new Promise((resolve, reject) => {
      const created_at = new Date();
      const enocean_relay = "";

      const point: DataPointModel = {
        serial,
        internal,
        contactair,
        enocean_relay,
        data,
        created_at
      };

      pool.queryParameters("INSERT INTO DataPoint SET ?", [{
        serial,
        internal,
        contactair,
        enocean_relay,
        data,
        created_at: created_at.getTime()
      }])
      .then(() => resolve(point))
      .catch(error =>   pool.manageErrorCrash("DataPoint", error, reject) );
    });
  }

  latestForContactair(contactair: string): Promise<DataPointModel|undefined> {
    return this.findMatching("contactair", contactair);
  }

  latestForSerial(serial: string): Promise<DataPointModel|undefined> {
    return this.findMatching("serial", serial);
  }

  latestForInternal(internal: string): Promise<DataPointModel|undefined> {
    return this.findMatching("internal", internal);
  }

  
  findMatching(key: string, value: string): Promise<DataPointModel|undefined> {
    return new Promise((resolve, reject) => {
      pool.queryParameters("SELECT * FROM DataPoint WHERE `"+key+"` = ? ORDER BY created_at DESC", [value])
      .then(results => resolve(results && results.length > 0 ? results[0] : undefined))
      .catch(error =>   pool.manageErrorCrash("DataPoint", error, reject) );
    });
  }
}
