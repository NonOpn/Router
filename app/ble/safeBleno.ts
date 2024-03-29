import { Logger } from "../log";
import NetworkInfo from "../network";
import { RESULT_UNLIKELY_ERROR } from "./BLEConstants";
import { BLEResultCallback } from "./BLESyncCharacteristic";

function log(data: any) {
    if(!NetworkInfo.instance.isGPRS()) {
        Logger.data({context: "ble", ...data});
    }
}

var bleno: any = null;
var needRepair: boolean = false;
try {
  bleno = require("bleno");
} catch (e) {
  console.log(e);
  bleno = null;
  !NetworkInfo.instance.isGPRS() && Logger.error(e, "Erreur while importing ble");

  log({bleno: "error"});

  if(e && e.toString) {
      const message = e.toString();
      needRepair = !!message && message.indexOf("NODE_MODULE_VERSION 48. This version of Node.js requires NODE_MODULE_VERSION 51") >= 0;
  }
}

export const logBLE = log;


try {
    if(!bleno) {
        needRepair = true;
    }
} catch(e) {

}

export interface SetServiceCallback {
    (err: any): any
}

export interface BLECallback {
    (result: number, buffer: Buffer): void;
}
  
export interface BLEWriteCallback {
    (value: string): Promise<boolean>;
}

export class SafePrimaryService {

}

export class SafeCharacteristics {
  constructor(json: any) {
    console.log("fake", json);
  }

  
  onReadRequest(offset: number, cb: BLECallback) {
    console.log("onReadRequest");
  }

  onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: BLEResultCallback) {
    callback(RESULT_UNLIKELY_ERROR);
  }
}

export const startAdvertising = (id: string, uuids: string[], callback: (error: any) => void) => {
    if(bleno) {
        bleno.startAdvertising(id, uuids, callback);
    } else {
        console.log("can't advertise for " + id, uuids);
    }
}

export const stopAdvertising = () => {
    if(bleno) {
        bleno.stopAdvertising();
    } else {
        console.log("can't stop advertising");
    }
}

export const setServices = (services: SafePrimaryService[], callback: SetServiceCallback) => {
    if (bleno) {
        bleno.setServices(services, callback);
        logBLE({ services: services.length});
    } else {
        console.log("setServices failed, no bleno")
    }
}

export const onBlenoEvent = (name: string, callback: any) => {
    if (bleno) {
        bleno.on(name, callback);
    } else {
        console.log("setServices failed, no bleno")
    }
}

export const mtu = (): number => {
    if(bleno) {
        return bleno.mtu;
    }
    return 0;
}

export interface GenericInterface<T> {
    new(something: any): T;
}

const _PrimaryService: GenericInterface<SafePrimaryService> = bleno ? bleno.PrimaryService : SafePrimaryService;
const _Characteristic: GenericInterface<SafeCharacteristics> = bleno ? bleno.Characteristic : SafeCharacteristics;
const _Descriptor = bleno ? bleno.Descriptor : null;


export const PrimaryService: GenericInterface<SafePrimaryService> = _PrimaryService;
export const Characteristic: GenericInterface<SafeCharacteristics> = _Characteristic;
export const Descriptor = _Descriptor;

export const isBlenoAvailable: boolean = null != bleno;
export const needBluetoothRepair: boolean = !!needRepair;