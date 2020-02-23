import BLESyncCharacteristic, { Result, BLEResultCallback } from './ble/BLESyncCharacteristic';
import config from "./config/config";
import DeviceModel from "./push_web/device_model";
import FrameModelCompress from "./push_web/frame_model_compress";
import visualisation from "./config/visualisation";
import Wifi from "./wifi/wifi.js";
import DeviceManagement, { TYPE } from "./ble/device";
import AbstractDevice from "./snmp/abstract";
import NetworkInfo from "./network";
import Diskspace from "./system";
import { Characteristic, BLECallback, BLEWriteCallback, PrimaryService, isBlenoAvailable, startAdvertising, setServices, onBlenoEvent, stopAdvertising } from "./ble/safeBleno";

const device_management = DeviceManagement.instance;
const wifi = Wifi.instance;
const network: NetworkInfo = NetworkInfo.instance;
const diskspace: Diskspace = Diskspace.instance;
const devices = DeviceModel.instance;

import {
  RESULT_SUCCESS,
  RESULT_INVALID_OFFSET,
  RESULT_ATTR_NOT_LONG,
  RESULT_INVALID_ATTRIBUTE_LENGTH,
  RESULT_UNLIKELY_ERROR
} from "./ble/BLEConstants";
import FrameModel, { Transaction } from './push_web/frame_model';


var id = "Routair";
if(config.identity && config.identity.length >= 5 * 2) { //0xAABBCCDD
  id += config.identity.substr(0, 5 * 2);
}

interface SeenDevices {
  devices: boolean[],
  count: number
}

var seenDevices: SeenDevices = {
  devices : [],
  count: 0
}

interface MethodPromise {
  (): Promise<any>;
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

  private _obtained: Buffer|undefined;
  private _timeout = 0;

  private readOrSend(): Promise<Buffer> {
    if(this._obtained) {
      return new Promise((resolve) => {
        this._timeout = 10;
        resolve(this._obtained);
      });
    }
    return this._callback()
    .then(value => {
      this._obtained = Buffer.from(value, "utf-8");
      const send_interval = this._timeout <= 0;
      this._timeout = 10;
      console.log("length := ", {byteLength: this._obtained.byteLength});

      send_interval && this.checkInterval();
      return this._obtained;
    });
  }

  private checkInterval() {
    if(this._timeout > 0) {
      console.log("-", {timeout: this._timeout});
      this._timeout --;
      setTimeout(() => this.checkInterval(), 100); //well 100ms should be enough to have 1s interval
    } else {
      console.log("killing interval");
      this._obtained = undefined;
    }
  }

  onReadRequest(offset: number, cb: BLECallback) {
    console.log("offset := ", {offset});
    this.readOrSend()
    .then(buffer => cb(RESULT_SUCCESS, buffer.slice(offset)));
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
  _tmp?: string|undefined = undefined;

  constructor(uuid: string, value: string, onValueRead: BLEWriteCallback) {
    super({
      uuid: uuid,
      properties: [ 'write' ],
      //secure: [ 'write' ]
    });

    if(onValueRead) this._onValueRead = onValueRead;
    else this._onValueRead = () => new Promise(r => r(false));

    setInterval(() => this.tryFlush(), 100);
  }

  _counter = 0;

  tryFlush() {
    this._counter --;

    if(this._counter < 0 && this._tmp){
      const tmp = this._tmp;
      this._tmp = undefined;
      console.log('WiFiBle - onWriteRequest: value = ', tmp);
      var p = undefined;
      if(tmp) p = this._onValueRead(tmp);
      else p = new Promise((r) => r());
  
      p.then(result => {
        console.log("write set ", result);
      }).catch(err => {
        console.log(err);
      });
    }

    if(this._counter < 0) this._counter = 0;
  }

  onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: BLEResultCallback) {
    console.log("setting " + data.toString()+" "+this._tmp);
    if(!this._tmp) {
      this._tmp = data.toString();
      if(!this._tmp) this._tmp = "";
    } else {
      this._tmp += data.toString();
    }
    callback(RESULT_SUCCESS);
    this._counter = 10;
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

class BLEPrimarySystemService extends PrimaryService {
  constructor(uuid: string) {
    super({
      uuid: uuid,
      characteristics: [
        new BLEAsyncDescriptionCharacteristic("0001", () => diskspace.diskspace().then(space => ""+space.free)),
        new BLEAsyncDescriptionCharacteristic("0002", () => diskspace.diskspace().then(space => ""+space.size)),
        new BLEAsyncDescriptionCharacteristic("0003", () => diskspace.diskspace().then(space => ""+space.used)),
        new BLEAsyncDescriptionCharacteristic("0004", () => diskspace.diskspace().then(space => ""+space.percent))
      ]
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

  device: AbstractDevice;

  constructor(device: AbstractDevice) {
    super({
      uuid: device.getUUID(),
      characteristics: [
        new BLEAsyncDescriptionCharacteristic("0001", () => device.getInternalSerial()),
        new BLEAsyncDescriptionCharacteristic("0002", () => device.getSerial()),
        new BLEAsyncDescriptionCharacteristic("0003", () => device.getType()),
        new BLEAsyncDescriptionCharacteristic("0004", () => device.getConnectedState()),
        new BLEAsyncDescriptionCharacteristic("0005", () => device.getImpactedState()),
        new BLEAsyncDescriptionCharacteristic("0006", () => this.createSeenDeviceCallback()),
        new BLEWriteCharacteristic("0007", "Update", (value: string) => this._editType(value)),
        new BLEAsyncDescriptionCharacteristic("0008", () => device.getAdditionnalInfo1()),
        new BLEAsyncDescriptionCharacteristic("0009", () => device.getAdditionnalInfo2()),
        new BLEAsyncDescriptionCharacteristic("000A", () => device.getLatestFramesAsString()),
      ]
    });

    this.device = device;
  }

  _editType(new_type?: string): Promise<boolean> {
    const type = DeviceManagement.instance.stringToType(new_type || "");
    return device_management.setType(this.device, type).then(device => {
      if(device) this.device = device;
      return !!device;
    });
  }

  tryUpdateDevice(device: AbstractDevice) {
    if(!this.device && device) {
      this.device = device;
    } else {
      Promise.all([
        this.device.getType(),
        device.getType()
      ]).then(types => {
        if(types && types.length == 2) {
          if(types[0] != types[1]) {
            this.device = device;
          }
        }
      }).catch(err => {});
    }
  }

  createSeenDeviceCallback() {
    return this.device.getInternalSerial()
    .then(internal_serial => !!seenDevices.devices[internal_serial] ? "true" : "false");
  }
}

class BLEReadWriteLogCharacteristic extends BLESyncCharacteristic {
  constructor(uuid: string, compress:boolean = false, use_write: boolean = true) {
    super(uuid, compress, use_write);
  }

  public getMaxFrame(): Promise<number> {
    return FrameModelCompress.instance.getMaxFrame();
  }

  public getMinFrame(): Promise<number> {
    return FrameModelCompress.instance.getMinFrame();
  }

  public getFrame(value: number, to_fetch: number): Promise<Transaction[]|undefined> {
    return FrameModelCompress.instance.getFrame(value, to_fetch);
  }
}

class BLEReadWriteLogIsAlertCharacteristic extends BLESyncCharacteristic {
  constructor(uuid: string, compress:boolean = false, use_write: boolean = true) {
    super(uuid, compress, use_write);
  }

  public getMaxFrame(): Promise<number> {
    return FrameModel.instance.getMaxFrame();
  }

  public getMinFrame(): Promise<number> {
    return FrameModel.instance.getMinFrame();
  }

  public getFrame(value: number, to_fetch: number): Promise<Transaction[]|undefined> {
    return FrameModel.instance.getFrameIsAlert(value, to_fetch);
  }

  public numberToFetch(): number {
    return 5;
  }
}

export default class BLE {

  private _notify_frame?: BLEFrameNotify;
  private _characteristics: any[]; //Characteristic
  private _ble_service: BLEPrimaryService;
  private _system_service: BLEPrimarySystemService;
  private _eth0_service: BLEPrimaryNetworkService;
  private _wlan0_service: BLEPrimaryNetworkService;
  private _services: any[];
  private _services_uuid: string[];

  _refreshing_called_once: boolean = false;
  _started_advertising: boolean = false;
  _started: boolean = false;
  _started_advertising_ok: boolean = false;

  _interval: NodeJS.Timeout|undefined = undefined;


  constructor() {
    if(!isBlenoAvailable) {
      console.log("disabling bluetooth... incompatible...");
      this._characteristics = [];
      this._refreshing_called_once = false;
      this._started_advertising = false;
      this._started = false;
      this._services = [];
      this._services_uuid = [];

      this._notify_frame = new BLEFrameNotify("0102", "Notify");
      this._ble_service = new BLEPrimaryService(this._characteristics);
      this._eth0_service = new BLEPrimaryNetworkService("bee6","eth0", ["eth0", "en1"]);
      this._wlan0_service = new BLEPrimaryNetworkService("bee7","wlan0", ["wlan0", "en0"]);
      this._system_service = new BLEPrimarySystemService("bee8");
  
      return;
    }

    //this._notify_frame = new BLEFrameNotify("0102", "Notify");

    this._characteristics = [
      new BLEDescriptionCharacteristic("0001", config.identity),
      new BLEDescriptionCharacteristic("0002", config.version),
      new BLEWriteCharacteristic("0101", "Wifi Config", (value: string) => this._onWifi(value)),
      new BLEWriteCharacteristic("0102", "Network Config", (value: string) => this._onNetwork(value)),
      new BLEAsyncDescriptionCharacteristic("0103", () => this._onDeviceSeenCall()),
      new BLEReadWriteLogCharacteristic("0104"),
      new BLEReadWriteLogCharacteristic("0105", true),
      new BLEReadWriteLogCharacteristic("0106", true, false),
      new BLEReadWriteLogIsAlertCharacteristic("0107", true, true)
      //this._notify_frame
    ];

    this._refreshing_called_once = false;
    this._ble_service = new BLEPrimaryService(this._characteristics);
    this._eth0_service = new BLEPrimaryNetworkService("bee6","eth0", ["eth0", "en1"]);
    this._wlan0_service = new BLEPrimaryNetworkService("bee7","wlan0", ["wlan0", "en0"]);
    this._system_service = new BLEPrimarySystemService("bee8");

    this._services = [
      this._ble_service,
      this._eth0_service,
      this._wlan0_service,
      this._system_service
    ]

    this._services_uuid = this._services.map(i => i.uuid);

    this._started_advertising = false;
    this._started = false;
  }

  refreshDevices() {
    if(!isBlenoAvailable) {
      return;
    }

    device_management.list()
    .then(devices => {
      const to_add: any[] = [];
      if(devices) {
        devices = devices.filter(device => device.getInternalSerial() && "ffffff" != device.getSyncInternalSerial());

        devices.forEach(device => {
          var found = false;
          this._services.forEach(service => {
            const uuid_left = device.getUUID().toLowerCase();
            const uuid_right = service.uuid.toLowerCase();
            if(service && uuid_left == uuid_right) {
              found = true;
              service.tryUpdateDevice(device);
            }
          });
          if(!found) to_add.push(new BLEPrimaryDeviceService(device));
        });

        to_add.forEach(service => this._services.push(service));
      }


      if(!this._refreshing_called_once || to_add.length > 0) {
        this._refreshing_called_once = true;

        this._services_uuid = this._services.map(i => i.uuid).filter(u => u.indexOf("bee") >= 0);
        startAdvertising(id, this._services_uuid);
  
        if(this._started_advertising_ok) {
          setServices(this._services, (err: any) => console.log('setServices: '  + (err ? 'error ' + err : 'success')));
        }
      }
    })
    .catch(err => {
      console.error(err);
      this._services_uuid = this._services.map(i => i.uuid).filter(u => u.indexOf("bee") >= 0);
      startAdvertising(id, this._services_uuid);
    })
  }

  start() {
    if(!isBlenoAvailable) {
      console.log("disabling bluetooth... incompatible...");
      return;
    }

    setTimeout(() => this.startDelayed(), 1000);
  }

  startDelayed() {
    if(!isBlenoAvailable) {
      console.log("disabling bluetooth... incompatible...");
      return;
    }

    if(this._started) return;

    FrameModelCompress.instance.start();

    this._started = true;
    onBlenoEvent('stateChange', (state: string) => {
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
        stopAdvertising();
      }
    });


    onBlenoEvent('advertisingStart', (err: any) => {
      console.log('on -> advertisingStart: ' + (err ? 'error ' + err : 'success'));

      if (!err && this._started_advertising) {
        this._started_advertising_ok = true;
        setServices( this._services, (err: any|undefined) => {
          console.log('setServices: '  + (err ? 'error ' + err : 'success'));
        });
      }
    });

    onBlenoEvent("advertisingStop", (err: any) => this._started_advertising_ok = false);

    onBlenoEvent("advertisingStartError", (err: any) => console.log(err))

    onBlenoEvent("disconnect", (client: any) => console.log("disconnect : client ->", client));
  }

  onFrame(frame: any) {
    if(!isBlenoAvailable) {
      console.log("disabling bluetooth... incompatible...");
      return;
    }

    console.log("sending frame");
    this._notify_frame && this._notify_frame.onFrame(frame);

    device_management.onFrame(frame)
    .then((device: AbstractDevice|undefined) => {
      if(device) {
        device.getInternalSerial()
        .then((internal_serial: string|undefined) => {
          if(internal_serial && !seenDevices.devices[internal_serial]) {
            seenDevices.devices[internal_serial] = true;
            seenDevices.count ++;
          }
        });
      }
    });
  }

  _onDeviceSeenCall(): Promise<string> {
    return new Promise((resolve, reject) => {
      resolve(""+seenDevices.count);
    })
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

    console.log("network " + tmp.password+" "+visualisation.password);
    if(tmp.password === visualisation.password) {
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
