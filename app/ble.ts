import bleno from "bleno";
import config from "../config/config";
import DeviceModel from "./push_web/device_model";
import visualisation from "../config/visualisation";
import Wifi from "./wifi/wifi.js";
import DeviceManagement from "./ble/device";
import AbstractDevice from "./snmp/abstract";
import NetworkInfo from "./network";

const PrimaryService = bleno.PrimaryService;
const Characteristic = bleno.Characteristic;
const Descriptor = bleno.Descriptor;
const device_management = DeviceManagement.instance;

const wifi = Wifi.instance;
const network: NetworkInfo = NetworkInfo.instance;
const devices = DeviceModel.instance;

const RESULT_SUCCESS = 0x00;
const RESULT_INVALID_OFFSET = 0x07;
const RESULT_ATTR_NOT_LONG = 0x0b;
const RESULT_INVALID_ATTRIBUTE_LENGTH = 0x0d;
const RESULT_UNLIKELY_ERROR = 0x0e;


var id = "Routair";
if(config.identity && config.identity.length >= 5 * 2) { //0xAABBCCDD
  id += config.identity.substr(0, 5 * 2);
}

interface BLECallback {
  (result: number, buffer: Buffer): void;
}

interface BLEWriteCallback {
  (value: string): Promise<boolean>;
}

interface MethodPromise {
  (): Promise<any>;
}

interface BLEResultCallback {
  (result: number): void;
}

interface NetworkConfiguration {
  ip?: string;
  netmask?: string;
  broadcast?: string;
  gateway?: string;
  restart? : boolean;
  dhcp?: boolean;
}

class BLEDescriptionCharacteristic extends Characteristic {
  _value: Buffer;

  constructor(uuid: string, value: any) {
    super({
      uuid: uuid,
      properties: ['read'],
      value: Buffer.from(value, 'utf-8')
    });

    this._value = Buffer.from(value, "utf-8");
  }

  onReadRequest(offset: number, cb: BLECallback) { cb(RESULT_SUCCESS, this._value) }
}

class BLEAsyncDescriptionCharacteristic extends Characteristic {
  _callback: MethodPromise;

  constructor(uuid:string, callback: MethodPromise) {
    super({
      uuid: uuid,
      properties: ['read']
    });

    this._callback = callback;
  }

  onReadRequest(offset: number, cb: BLECallback) {
    this._callback()
    .then(value => cb(RESULT_SUCCESS, Buffer.from(value, "utf-8")));
  }
}


interface BufferCallback {
  (buffer: Buffer): void;
}

class BLEFrameNotify extends Characteristic {
  _value: Buffer;
  _updateFramesCallback: BufferCallback|null = null;

  constructor(uuid: string, value: any) {
    super({
      uuid: uuid,
      properties: ['notify']
    });

    this._value = Buffer.from(value, "utf-8");
  }


  onSubscribe(maxValueSize: number, callback: BufferCallback) { this._updateFramesCallback = callback; }

  onUnsubscribe() { this._updateFramesCallback = null; }

  onFrame(frame: any) {
    console.log("sending frame, having notify ?", (null != this._updateFramesCallback));
    if(this._updateFramesCallback) {
      this._updateFramesCallback(Buffer.from(frame.rawFrameStr, "utf-8"));
    }
  }
}

class BLEWriteCharacteristic extends Characteristic {
  _onValueRead: BLEWriteCallback;

  constructor(uuid: string, value: string, onValueRead: BLEWriteCallback) {
    super({
      uuid: uuid,
      properties: [ 'write' ],
      //secure: [ 'write' ]
    });

    if(onValueRead) this._onValueRead = onValueRead;
    else this._onValueRead = () => new Promise(r => r(false));
  }

  onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: BLEResultCallback) {
    console.log('WiFiBle - onWriteRequest: value = ', data);
    var p = undefined;
    if(data) p = this._onValueRead(data.toString());
    else p = new Promise((r) => r());

    p.then(result => {
      console.log("write set ", result);
      if(result) callback(RESULT_SUCCESS);
      else callback(RESULT_UNLIKELY_ERROR);
    }).catch(err => {
      console.log(err);
      callback(RESULT_UNLIKELY_ERROR);
    });
  };
}

class BLEPrimaryService extends PrimaryService {

  constructor(characteristics: any[]) {
    super({
      uuid: 'bee5',
      characteristics: characteristics
    });
  }
}

class BLEPrimaryNetworkService extends PrimaryService {
  constructor(uuid: string, name: string, intfs: string[]) {
    super({
      uuid: uuid,
      characteristics: [
        new BLEDescriptionCharacteristic("0001", name),
        new BLEAsyncDescriptionCharacteristic("0002", network.readInterface(intfs, "ip_address")),
        new BLEAsyncDescriptionCharacteristic("0003", network.readInterface(intfs, "mac_address")),
        new BLEAsyncDescriptionCharacteristic("0004", network.readInterface(intfs, "type")),
        new BLEAsyncDescriptionCharacteristic("0005", network.readInterface(intfs, "netmask")),
        new BLEAsyncDescriptionCharacteristic("0006", network.readInterface(intfs, "gateway_ip"))
      ]
    });
  }
}

class BLEPrimaryDeviceService extends PrimaryService {
  constructor(device: AbstractDevice) {
    super({
      uuid: device.getUUID(),
      characteristics: [
        new BLEAsyncDescriptionCharacteristic("0001", () => device.getInternalSerial()),
        new BLEAsyncDescriptionCharacteristic("0002", () => device.getSerial()),
        new BLEAsyncDescriptionCharacteristic("0003", () => device.getType()),
        new BLEAsyncDescriptionCharacteristic("0004", () => device.getConnectedState()),
        new BLEAsyncDescriptionCharacteristic("0005", () => device.getImpactedState())
      ]
    });
  }
}

export default class BLE {

  _notify_frame: BLEFrameNotify;
  _characteristics: any[]; //Characteristic
  _ble_service: BLEPrimaryService;
  _eth0_service: BLEPrimaryNetworkService;
  _wlan0_service: BLEPrimaryNetworkService;
  _services: any[];
  _services_uuid: string[];

  _refreshing_called_once: boolean = false;
  _started_advertising: boolean = false;
  _started: boolean = false;
  _started_advertising_ok: boolean = false;

  _interval: NodeJS.Timeout|undefined = undefined;


  constructor() {
    this._notify_frame = new BLEFrameNotify("0102", "Notify");

    this._characteristics = [
      new BLEDescriptionCharacteristic("0001", config.identity),
      new BLEDescriptionCharacteristic("0002", config.version),
      new BLEWriteCharacteristic("0101", "Wifi Config", (value: string) => this._onWifi(value)),
      new BLEWriteCharacteristic("0102", "Network Config", (value: string) => this._onNetwork(value)),
      this._notify_frame
    ];

    this._refreshing_called_once = false;
    this._ble_service = new BLEPrimaryService(this._characteristics);
    this._eth0_service = new BLEPrimaryNetworkService("bee6","eth0", ["eth0", "en1"]);
    this._wlan0_service = new BLEPrimaryNetworkService("bee7","wlan0", ["wlan0", "en0"]);

    this._services = [
      this._ble_service,
      this._eth0_service,
      this._wlan0_service
    ]

    this._services_uuid = this._services.map(i => i.uuid);

    this._started_advertising = false;
    this._started = false;
  }

  refreshDevices() {
    console.log("refreshing devices");

    device_management.list()
    .then(devices => {
      console.log("device_management", devices);

      const to_add: any[] = [];
      if(devices) {
        devices.forEach(device => {
          var found = false;
          this._services.forEach(service => {
            const uuid_left = device.getUUID().toLowerCase();
            const uuid_right = service.uuid.toLowerCase();
            if(uuid_left == uuid_right) found = true;
          });
          if(!found) to_add.push(new BLEPrimaryDeviceService(device));
        });

        to_add.forEach(service => this._services.push(service));
      }


      if(!this._refreshing_called_once || to_add.length > 0) {
        this._refreshing_called_once = true;
        console.log("we called one time or have services to add");

        this._services_uuid = this._services.map(i => i.uuid);

        bleno.startAdvertising(id, this._services_uuid);
  
        if(this._started_advertising_ok) {
          bleno.setServices(this._services, (err: any) => console.log('setServices: '  + (err ? 'error ' + err : 'success')));
        }
      }
    })
    .catch(err => {
      console.error(err);
      bleno.startAdvertising(id, this._services_uuid);
    })
  }

  start() {
    setTimeout(() => this.startDelayed(), 1000);
  }

  startDelayed() {
    if(this._started) return;

    this._started = true;
    bleno.on('stateChange', (state: string) => {
      console.log('on -> stateChange: ' + state);

      if (state == 'poweredOn' && !this._started_advertising) {
        this._started_advertising = true;
        console.log("starting advertising for", this._services_uuid);

        this._interval = setInterval(() => this.refreshDevices(), 5000);
        this.refreshDevices();
      } else if(this._started_advertising) {
        this._started_advertising = false;
        console.log("stopping ", state);
        this._interval && clearInterval(this._interval);
        bleno.stopAdvertising();
      }
    });


    bleno.on('advertisingStart', (err: any) => {
      console.log('on -> advertisingStart: ' + (err ? 'error ' + err : 'success'));

      if (!err && this._started_advertising) {
        this._started_advertising_ok = true;
        bleno.setServices( this._services, (err: any|undefined) => {
          console.log('setServices: '  + (err ? 'error ' + err : 'success'));
        });
      }
    });

    bleno.on("advertisingStop", (err: any) => this._started_advertising_ok = false);

    bleno.on("advertisingStartError", (err: any) => console.log(err))

    bleno.on("disconnect", (client: any) => console.log("disconnect : client ->", client));
  }

  onFrame(frame: any) {
    console.log("sending frame");
    this._notify_frame.onFrame(frame);
    device_management.onFrame(frame);
  }

  json(value: string): any {
    var json = {};
    try {
      json = JSON.parse(value);
    } catch (e) {
      console.error(e);
    }
    return json;
  }

  _onNetwork(value: string): Promise<boolean> {
    var j: NetworkConfiguration|undefined = undefined;
    const tmp = this.json(value);
    var net_interface: string = "";

    if(tmp.password === visualisation.password && tmp.ssid && tmp.passphrase) {
      console.log("configuration valid found, saving it");
      if(tmp.interface) {
        if("eth0" == tmp.interface) net_interface = "eth0";
        else if("wlan0" == tmp.interface) net_interface = "wlan0";
      }

      if(tmp.ip && tmp.netmask && tmp.broadcast && tmp.gateway) {
        j = { ip: tmp.ip, netmask: tmp.netmask, broadcast: tmp.broadcast, gateway: tmp.gateway, restart: true };
      } else if(tmp.dhcp) {
        j = { dhcp: true, restart: true};
      }

      return new Promise((resolve, reject) => {
        network.configure(net_interface, j, (err: any) => {
          console.log("set network info", err);
          if(err) reject(err);
          else resolve(true);
        });
      })
    }

    return new Promise((r, reject) => reject("invalid"));

  }

  _onWifi(value: string): Promise<boolean> {
    var json = undefined;
    const tmp = this.json(value);

    if(tmp.password === visualisation.password && tmp.ssid && tmp.passphrase) {
      console.log("configuration valid found, saving it");
      json = { ssid: tmp.ssid, passphrase: tmp.passphrase };
    }

    if(!json) return new Promise((r, reject) => reject("invalid"));
    return wifi.storeConfiguration(json)
    .then(success => {
      if(success === true) console.log("configuration saved");
      else console.log("error while saving");
      return success;
    }).catch(err => {
      console.log("error while saving", err);
      return false;
    });
  }
}
