import Pool from "./pool";
import Abstract from "../database/abstract.js";
import { Reject } from "../promise";

const pool: Pool = Pool.instance;

function create() {
  pool.query("CREATE TABLE IF NOT EXISTS Device ("
    + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
    + "`serial` VARCHAR(20) NOT NULL,"
    + "`internal_serial` VARCHAR(20) NOT NULL,"
    + "`last_contactair` VARCHAR(20),"
    + "`last_contactair_index` INTEGER DEFAULT 0,"
    + "`type_set` TINYINT(1) DEFAULT 0,"
    + "`type` INTEGER,"
    + "KEY `internal_serial` (`internal_serial`)"
    + ")ENGINE=MyISAM;")
    .then(() => pool.query("ALTER TABLE Device ADD COLUMN `last_contactair` VARCHAR(20)", true))
    .then(() => pool.query("ALTER TABLE Device ADD COLUMN `last_contactair_index` INTEGER DEFAULT 0", true))
  .then(results => {
    console.log("device_model done");
  });
}
pool.query("REPAIR TABLE Device")
.then(() => create())
.catch(err => {
  console.log(err);
  create();
})

const MODEL = "Device";

function createInsertRows(): string {
  var columns = ["serial","internal_serial", "type", "last_contactair", "last_contactair_index"]
  columns = columns.map(col=> "`"+col+"`");
  return "INSERT INTO Device ("+columns.join(",")+") VALUES ? ";
}

const INSERT_ROWS = createInsertRows();

export interface Device {
  id?: number;
  serial: string;
  internal_serial: string;
  type: number;
  last_contactair?: string;
  last_contactair_index?: number;
}

function ToJson(device: Device): Device {
  return {
    id: device.id,
    serial: device.serial,
    internal_serial: device.internal_serial,
    type: device.type,
    last_contactair: device.last_contactair,
    last_contactair_index: device.last_contactair_index || 0
  }
}

function ToArrayForInsert(device: Device): any[] {
  return [
    device.serial,
    device.internal_serial,
    device.type,
    device.last_contactair,
    device.last_contactair_index || 0
  ]
}

function manageErrorCrash(error: Error, reject: Reject) {
  console.log("Device crash", error);
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
      .catch(error => {
        manageErrorCrash(error, () => console.log("crashed in list()"));
        resolve([]);
      });
    });
  }

  listDevice(): Promise<Device[]> {
    return this.list()
    .then(devices => devices.map(device => ToJson(device)));
  }

  cleanContactair() {
    return pool.query("UPDATE Device AS D1 LEFT JOIN Device AS D2 ON D1.last_contactair = D2.last_contactair SET D1.last_contactair_index = 0, D1.last_contactair = NULL WHERE D1.last_contactair_index < D2.last_contactair_index")
    .then(() => true)
    .catch(error => {
      manageErrorCrash(error, () => console.log("crashed in getDeviceForInternalSerial()"));
      return false;
    });
  }

  unsetContactair(last_contactair: string, frame_id: number): Promise<boolean> {
    if(!last_contactair) last_contactair = "";
    return pool.queryParameters("UPDATE Device SET last_contactair_index = 0, last_contactair = NULL WHERE last_contactair=? AND last_contactair_index < ? ORDER BY id LIMIT 1", [last_contactair, frame_id])
    .then(() => true)
    .catch(error => {
      manageErrorCrash(error, () => console.log("crashed in getDeviceForInternalSerial()"));
      return false;
    });
  }

  setContactairForDevice(last_contactair: string, internal_serial: string, frame_id: number): Promise<Device|undefined> {
    if(!last_contactair) last_contactair = "";
    if(!internal_serial) internal_serial = "";
    return new Promise((resolve, reject) => {
      this.unsetContactair(last_contactair, frame_id)
      .then(() => pool.queryParameters("UPDATE Device SET last_contactair_index = ?, last_contactair = ? WHERE internal_serial=? AND last_contactair_index < ? ORDER BY id LIMIT 1", [frame_id, last_contactair, internal_serial, frame_id]))
      .then(() => this.getDeviceForInternalSerial(internal_serial))
      .then(device => resolve(device))
      .catch(error => {
        manageErrorCrash(error, () => console.log("crashed in getDeviceForInternalSerial()"));
        resolve(undefined);
      });
    });
  }

  getDeviceForInternalSerial(internal_serial: string): Promise<Device|undefined> {
    if(!internal_serial) internal_serial = "";
    return new Promise((resolve, reject) => {
      pool.queryParameters("SELECT * FROM Device WHERE internal_serial=? ORDER BY id LIMIT 1", [internal_serial])
      .then(results => {
        if(!results || results.length == 0) resolve(undefined);
        else resolve(ToJson(results[0]));
      })
      .catch(error => {
        manageErrorCrash(error, () => console.log("crashed in getDeviceForInternalSerial()"));
        resolve(undefined);
      });
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
      .catch(error => {
        manageErrorCrash(error, () => console.log("crashed in getDeviceForSerial()"));
        resolve(undefined);
      });
    });
  }

  getDeviceForContactair(contactair: string): Promise<Device|undefined> {
    if(!contactair) contactair = "";
    return new Promise((resolve, reject) => {
      pool.queryParameters("SELECT * FROM Device WHERE last_contactair=? ORDER BY id LIMIT 1", [contactair])
      .then(results => {
        if(!results || results.length == 0) resolve(undefined);
        else resolve(ToJson(results[0]));
      })
      .catch(error => {
        manageErrorCrash(error, () => console.log("crashed in getDeviceForSerial()"));
        resolve(undefined);
      });
    });
  }

  saveType(internal_serial: string, type: number) {
    return new Promise((resolve, reject) => {
      pool.queryParameters("UPDATE Device SET type_set=1, type=? WHERE internal_serial=? ORDER BY id LIMIT 1", [type, internal_serial])
      .then(results => {
        resolve(true);
      })
      .catch(error => {
        manageErrorCrash(error, () => console.log("crashed in saveType()"));
        resolve(undefined);
      });
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
