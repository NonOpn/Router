import Pool from "./pool";
import Abstract from "../database/abstract.js";
import { Reject } from "../promise";

const pool: Pool = Pool.instance;

pool.query("CREATE TABLE IF NOT EXISTS Device ("
  + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
  + "`serial` VARCHAR(20) NOT NULL,"
  + "`internal_serial` VARCHAR(20) NOT NULL,"
  + "`type` INTEGER,"
  + "KEY `internal_serial` (`internal_serial`)"
  + ")ENGINE=MyISAM;")
.then(results => {
  console.log("device_model done");
})

const MODEL = "Device";

function createInsertRows(): string {
  var columns = ["serial","internal_serial", "type"]
  columns = columns.map(col=> "`"+col+"`");
  return "INSERT INTO Device ("+columns.join(",")+") VALUES ? ";
}

const INSERT_ROWS = createInsertRows();

export interface Device {
  id?: number;
  serial: string;
  internal_serial: string;
  type: number;
}

function ToJson(device: Device): Device {
  return {
    id: device.id,
    serial: device.serial,
    internal_serial: device.internal_serial,
    type: device.type
  }
}

function ToArrayForInsert(device: Device): any[] {
  return [
    device.serial,
    device.internal_serial,
    device.type
  ]
}

function manageErrorCrash(error: Error, reject: Reject) {
  pool.manageErrorCrash("Device", error, reject);
}

export default class DeviceModel extends Abstract {
  static instance: DeviceModel = new DeviceModel();

  constructor() {
    super();
  }

  getModelName(): string {
    return MODEL;
  }

  list(): Promise<Device[]> {
    return new Promise((resolve, reject) => {
      pool.query("SELECT * FROM Device ORDER BY id LIMIT 100")
      .then(results => {
        if(!results || results.length == 0) results = [];
        resolve(results);
      })
      .catch(error => manageErrorCrash(error, reject));
    });
  }

  listDevice(): Promise<Device[]> {
    return this.list()
    .then(devices => devices.map(device => ToJson(device)));
  }

  getDeviceForInternalSerial(internal_serial: string): Promise<Device|undefined> {
    if(!internal_serial) internal_serial = "";
    return new Promise((resolve, reject) => {
      pool.queryParameters("SELECT * FROM Device WHERE internal_serial=? ORDER BY id LIMIT 1", [internal_serial])
      .then(results => {
        if(!results || results.length == 0) resolve(undefined);
        else resolve(ToJson(results[0]));
      })
      .catch(error => manageErrorCrash(error, reject));
    });
  }

  getDeviceForSerial(serial: string): Promise<Device|undefined> {
    if(!serial) serial = "";
    return new Promise((resolve, reject) => {
      pool.queryParameters("SELECT * FROM Device WHERE serial=? ORDER BY id LIMIT 1", [serial])
      .then(results => {
        if(!results || results.length == 0) resolve(undefined);
        else resolve(ToJson(results[0]));
      })
      .catch(error => manageErrorCrash(error, reject));
    });
  }

  saveDevice(device: Device): Promise<Device|undefined> {
    return this.saveMultiple([device]).then(devices => {
      console.log("saveDevice", devices);
      if(devices && devices.length > 0) return devices[0];
      return undefined;
    });
  }

  saveMultiple(devices: Device[]): Promise<Device[]> {
    return new Promise((resolve, reject) => {
      var array: any[] = [];

      try {
        array = devices.map(device => ToArrayForInsert(device));
      } catch(e) {
        console.log(e);
      }

      pool.queryParameters(INSERT_ROWS, [array])
      .then(result => {
        console.log("result", result);
        resolve(devices);
      })
      .catch(error => manageErrorCrash(error, reject));
    });
  }
}