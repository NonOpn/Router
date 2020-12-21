import { BLELargeSyncCharacteristic, Result, BLEResultCallback } from './ble/BLESyncCharacteristic';
import config from "./config/config";
import DeviceModel from "./push_web/device_model";
import FrameModelCompress from "./push_web/frame_model_compress";
import visualisation from "./config/visualisation";
import Wifi from "./wifi/wifi.js";
import DeviceManagement, { TYPE } from "./ble/device";
import AbstractDevice from "./snmp/abstract";
import NetworkInfo from "./network";
import { Diskspace, SystemInfo } from "./system";
import { Characteristic, BLECallback, BLEWriteCallback, PrimaryService, isBlenoAvailable, startAdvertising, setServices, onBlenoEvent, stopAdvertising, mtu, needBluetoothRepair } from "./ble/safeBleno";

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
import { Logger } from './log';


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
      value: Buffer.from(""+value, 'utf-8')
    });

    this._value = Buffer.from(""+value, "utf-8");
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
  private _last_offset = 0;

  private readOrSend(offset: number): Promise<Buffer> {
    if(offset > 0 && this._last_offset <= offset) {
      return new Promise((resolve) => {
        this._last_offset = offset;
        resolve(this._obtained);
      });
    }
    return this._callback()
    .then(value => {
      this._obtained = Buffer.from(""+value, "utf-8");
      this._last_offset = offset;
      return this._obtained;
    });
  }

  onReadRequest(offset: number, cb: BLECallback) {
    this.readOrSend(offset)
    .then(buffer => {
      const current_mtu = Math.max(0, mtu() - 4);
      
      if(current_mtu >= buffer.byteLength - offset) {
        //console.log("ended !");
      }
      cb(RESULT_SUCCESS, buffer.slice(offset));
    });
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

    this._value = Buffer.from(""+value, "utf-8");
  }


  onSubscribe(maxValueSize: number, callback: BufferCallback) { this._updateFramesCallback = callback; }

  onUnsubscribe() { this._updateFramesCallback = null; }

  onFrame(frame: any) {
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
      var p = undefined;
      if(tmp) p = this._onValueRead(tmp);
      else p = new Promise((r) => r());
  
      p.then(result => {

      }).catch(err => {
        console.log(err);
      });
    }

    if(this._counter < 0) this._counter = 0;
  }

  onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: BLEResultCallback) {
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
        new BLEAsyncDescriptionCharacteristic("0004", () => diskspace.diskspace().then(space => ""+space.percent)),
        new BLEAsyncDescriptionCharacteristic("0101", () => SystemInfo.instance.uname()),
        new BLEAsyncDescriptionCharacteristic("0102", () => SystemInfo.instance.uptime()),
        new BLEAsyncDescriptionCharacteristic("0103", () => SystemInfo.instance.arch()),
        new BLEAsyncDescriptionCharacteristic("0104", () => SystemInfo.instance.release()),
        new BLEAsyncDescriptionCharacteristic("0105", () => SystemInfo.instance.version()),
        new BLEAsyncDescriptionCharacteristic("0106", () => SystemInfo.instance.platform()),
        new BLEAsyncDescriptionCharacteristic("0201", () => SystemInfo.instance.canBeRepaired().then(result => result ? "true":"false")),
        new BLEAsyncDescriptionCharacteristic("0202", () => SystemInfo.instance.isv6l().then(result => result ? "true":"false")),
        new BLEAsyncDescriptionCharacteristic("0203", () => Promise.resolve(false/*can be repaired in offline mode*/)),
        new BLEAsyncDescriptionCharacteristic("0204", () => Promise.resolve(false/*can repair database*/)),
        new BLEAsyncDescriptionCharacteristic("0301", () => FrameModel.instance.getCount()),
        new BLEAsyncDescriptionCharacteristic("0302", () => FrameModel.instance.getLowestSignal(30)),
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

class BLEReadWriteLogCharacteristic extends BLELargeSyncCharacteristic {
  constructor(uuid: string, compress:boolean = false, use_write: boolean = true) {
    super(uuid, 50, compress, use_write, mtu);
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

class BLEReadWriteLogIsAlertCharacteristic extends BLELargeSyncCharacteristic {
  constructor(uuid: string, compress:boolean = false, use_write: boolean = true) {
    super(uuid, 50, compress, use_write, mtu);
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
  private _eth1_service: BLEPrimaryNetworkService;
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
      this._eth1_service = new BLEPrimaryNetworkService("bee9","eth1", ["eth1", "gprs"]);
  
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
      new BLEReadWriteLogIsAlertCharacteristic("0107", false, true)
      //this._notify_frame
    ];

    this._refreshing_called_once = false;
    this._ble_service = new BLEPrimaryService(this._characteristics);
    this._eth0_service = new BLEPrimaryNetworkService("bee6","eth0", ["eth0", "en1"]);
    this._wlan0_service = new BLEPrimaryNetworkService("bee7","wlan0", ["wlan0", "en0"]);
    this._system_service = new BLEPrimarySystemService("bee8");
    this._eth1_service = new BLEPrimaryNetworkService("bee9","eth1", ["eth1"]);

    this._services = [
      this._ble_service,
      this._eth0_service,
      this._eth1_service,
      this._wlan0_service,
      this._system_service
    ]

    this._services_uuid = this._services.map(i => i.uuid);

    this._started_advertising = false;
    this._started = false;
  }

  needRepair(): boolean {
    return needBluetoothRepair;
  }

  refreshDevices = async () => {
    if(!isBlenoAvailable) {
      return;
    }

    try {
      var devices = await device_management.list();
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
    } catch(err) {
      if(!NetworkInfo.instance.isGPRS()) Logger.error(err, "refreshDevices");
      console.error(err);
      this._services_uuid = this._services.map(i => i.uuid).filter(u => u.indexOf("bee") >= 0);
      startAdvertising(id, this._services_uuid);
    };
  }

  start() {
    if(!isBlenoAvailable) {
      console.log("disabling bluetooth... incompatible...");

      if(!NetworkInfo.instance.isGPRS()) {
        Logger.data({context: "ble", status: "incompatible"});
      }

      return;
    }

    setTimeout(() => this.startDelayed(), 1000);
  }

  onStateChanged = (state: string) => {
    console.log('on -> stateChange: ' + state);

    if (state == 'poweredOn' && !this._started_advertising) {
      if(!NetworkInfo.instance.isGPRS()) {
        Logger.data({context: "ble", status: "stateChange", state, started: this._started_advertising, todo: "start"});
      }
      this._started_advertising = true;
      console.log("starting advertising for", this._services_uuid);

      this._interval = setInterval(() => this.refreshDevices(), 5000);
      this.refreshDevices();
    } else if(this._started_advertising) {
      if(!NetworkInfo.instance.isGPRS()) {
        Logger.data({context: "ble", status: "stateChange", state, started: this._started_advertising, todo: "stop"});
      }
      this._started_advertising = false;
      console.log("stopping ", state);
      this._interval && clearInterval(this._interval);
      stopAdvertising();
    } else {
      if(!NetworkInfo.instance.isGPRS()) {
        Logger.data({context: "ble", status: "stateChange", state, started: this._started_advertising, todo: "nothing"});
      }
    }
  };

  startDelayed() {
    if(!isBlenoAvailable) {
      console.log("disabling bluetooth... incompatible...");

      if(!NetworkInfo.instance.isGPRS()) {
        Logger.data({context: "ble", status: "incompatible"});
      }
      return;
    }

    if(this._started) return;

    FrameModelCompress.instance.start();

    this._started = true;
    onBlenoEvent("mtuChange", (mtuValue: number) => {
      const global_mtu = mtuValue || 23;
      console.log("new mtu value", global_mtu);
      if(!NetworkInfo.instance.isGPRS()) {
        Logger.data({context: "ble", status: "mtuChange", mtuValue});
      }
    });

    setTimeout(() => this.onStateChanged("poweredOn"), 30 * 1000);

    onBlenoEvent('stateChange', this.onStateChanged);

    onBlenoEvent('advertisingStart', (err: any) => {
      console.log('on -> advertisingStart: ' + (err ? 'error ' + err : 'success'));

      if (!err && this._started_advertising) {
        this._started_advertising_ok = true;
        setServices( this._services, (err: any|undefined) => {

          if(!NetworkInfo.instance.isGPRS()) {
            if(err) Logger.error(err, "advertisingState");
            else Logger.data({context: "ble", status: "advertising", success: true});
          }
          console.log('setServices: '  + (err ? 'error ' + err : 'success'));
        });
      }
    });

    onBlenoEvent("advertisingStop", (err: any) => this._started_advertising_ok = false);

    onBlenoEvent("advertisingStartError", (err: any) => {

      if(!NetworkInfo.instance.isGPRS()) {
        Logger.error(err, "advertisingStartError");
      }
      console.log(err);
    });

    onBlenoEvent("disconnect", (client: any) => console.log("disconnect : client ->", client));
  }

  onFrame(device: AbstractDevice|undefined, frame: any) {
    if(!isBlenoAvailable) {
      console.log("disabling bluetooth... incompatible...");
      return;
    }

    console.log("sending frame");
    this._notify_frame && this._notify_frame.onFrame(frame);

    if(device) {
      device.getInternalSerial()
      .then((internal_serial: string|undefined) => {
        if(internal_serial && !seenDevices.devices[internal_serial]) {
          seenDevices.devices[internal_serial] = true;
          seenDevices.count ++;
        }
      });
    }
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
