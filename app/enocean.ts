import { EventEmitter } from "events";
//@ts-ignore
import uuidV4 from "uuid/v4";
//@ts-ignore
import SerialPort from "serialport";
//@ts-ignore
import Enocean from "node-enocean";

import config from "./config/enocean";

const getByte = (telegram_byte_str: any, index: any): any => telegram_byte_str[index * 2 ] + telegram_byte_str[index * 2 + 1];
const getEEP = (rorg: any, rorg_func: any, rorg_type: any): any => (rorg+"-"+rorg_func+"-"+rorg_type).toLowerCase()
const isFrameToSend = (rorg: any): any => ["a5", "f6", "d5", "d2", "d1"].filter(e => e === rorg).length > 0;

function isARecognizedKnownDevice(port: any) {
  if(port.manufacturer !== undefined) {
    return ["ftdi", "enocean"].find(element => port.manufacturer.toLowerCase().indexOf(element) >= 0);
  }
  return false;
}

function isARecognizedDevice(port: any) {
  if(isARecognizedKnownDevice(port)) {
    return true;
  }

  return ["/dev/ttyAMA0"].find(s => s === port.path);
}

interface SerialDevice {
  path?: string,
  manufacturer?: string
}

class EnoceanDevice extends EventEmitter {
  enocean = Enocean();
  
  open_device: any = undefined;
  port: any|undefined;

  constructor(port: any) {
    super();

    this.port = port;
  }

  init() {
    this.enocean.on("ready", () => {
      this.emit("usb-open", this.port);
    });
    this.enocean.on("data", (data: any) => {
      try{
        this.enocean.info(data.senderId, (sensor: any) => this.onLastValuesRetrieved(sensor, (sensor == undefined ? {} : undefined), data));
      }catch(e){
        console.log(e)
      }
    });
    this.enocean.on("learned", (data: any) => {
      this.enocean.getSensors((sensors: any) => this.emit("new_learned_list", sensors) );
    });
    this.enocean.on("unknown-teach-in", (data: any) => { });
    this.enocean.on("error", (err: any) => this.checkEventClose(this) );
    this.enocean.on("disconnect", (e: any, ee: any) => this.checkEventClose(this) );
  
    this.enocean.connect("mongodb://localhost/snmp_memory");

    this.enocean.register(this);
    this.enocean.emitters.push(this);
    this.on("get-usb-state", () => {
      if(this.open_device == undefined) {
        this.emit("usb-state", "off");
      }else{
        this.emit("usb-state", "on");
      }
    });

    this.openDevice(this.port);
  }

  isOpen = () => !!this.open_device;

  checkEventClose(caller: any) {
    if(this.open_device != undefined) {
      this.emit("usb-closed", this.open_device);
      this.open_device = undefined;
    }
  }

  onLastValuesRetrieved(sensor_data: any, err: any, data: any) {
    try{
      var eep: any = undefined;

      if(sensor_data != undefined && sensor_data.eep != undefined) {
        eep = sensor_data.eep;
      }

      if((eep != undefined) || data.rawByte.length >= (6+7)) { //at least 6 bytes for headers and 7 to have all data
        var rorg = undefined;
        if(eep == undefined) {
          rorg =  getByte(data.rawByte, 6);
          var rorg_func = getByte(data.rawByte, 6 + 6);
          var rorg_type = getByte(data.rawByte, 6 + 7);
          eep = getEEP(rorg, rorg_func, rorg_type);
        }else{
          rorg = eep.split("-")[0];
        }

        if(isFrameToSend(rorg)) {
          //var rawFrame = new Buffer(data.rawByte, "hex");
          //var rawData = new Buffer(data.raw, "hex");
          var resolved = this.enocean.eepResolvers.find((func: any) => {
            try{
              var ret = func(eep, data.raw);
              if(ret != undefined) return ret;
            }catch(e) {
              console.log(e);
            }
            return undefined;
          });

          var output: any = {
            "date": new Date(),
            "guid": uuidV4(),
            "sender": data.senderId,
            "eep": eep
          }

          if(resolved != undefined) {
            output.data = resolved;
          }

          output.rawDataStr = data.raw;
          output.rawFrameStr = data.rawByte;

          this.emit("managed_frame", output);
        }
      }
    }catch(e) {
      console.log(e);
    }
  }


  openDevice(port: any) {
    try{
      this.open_device = port;

      this.enocean.listen(port.comName);
    } catch(e) {
      console.log(e);
    }
  }

  comName() {
    return this.open_device.comName;
  }
}

export default class EnoceanLoader extends EventEmitter {
  devices: EnoceanDevice[] = [];
  started: boolean = false;

  constructor() {
    super();
  }

  private openDevice(port: any) {
    if (this.devices.find(d => d.comName() == port.comName)) return;

    const bindTo = new EnoceanDevice(port);

    bindTo.on("ready", (port) => this.emit("usb-open", port));
    bindTo.on("managed_frame", (output: any) => this.emit("managed_frame", output));
    bindTo.on("new_learned_list", (sensors: any) => this.emit("new_learned_list", sensors));
    bindTo.on("unknown-teach-in", (data: any) => { });
    bindTo.on("usb-closed", (device: any) => this.emit("usb-closed", device));

    this.devices.push(bindTo);
    bindTo.init();
  }

  removeDevice(device: EnoceanDevice) {
    device.removeAllListeners("ready");
    device.removeAllListeners("managed_frame");
    device.removeAllListeners("new_learned_list");
    device.removeAllListeners("unknown-teach-in");
    device.removeAllListeners("usb-closed");
  }

  private postNextRead() {
    setTimeout(() => this.readDevices(), 15000);
  }

  init() {
    if(!this.started) {
      this.started = true;
      this.readDevices();
    }
  }

  readDevices() {
    if(!this.devices.find(device => device.isOpen())) {
      const endpoint = config.enocean_endpoint;
      console.log("having endpoint in config ? ", endpoint);
      if(endpoint != null) {
        this.openDevice({ comName: endpoint });
      }

      this.listDevices().then(devices => {
        console.log("new devices", devices);
        if (!!endpoint && !!devices.find(d => d.comName === endpoint)) {
          devices = devices.filter(d => d.comName !== endpoint);
        }

        console.log("valid devices", devices);
        devices.forEach(device => this.openDevice(device));
      }).catch(err => {
        console.log(err);
      });

      this.postNextRead();
    }
  }

  private listAllDevice(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const callback = (err: any, ports?: any) => {
        if(err) {
          reject(err);
          return;
        }
        if(!ports) ports = [];
        console.log("list of found devices", ports);

        resolve(ports);
      };

      const fallback = () => {
        const list: Promise<any> = SerialPort.list();
        list.then(ports => callback(null, ports))
        .catch(err => reject(err));
      }

      try {
        const result = SerialPort.list(callback);
        if(result && result.then) {
          result.then(fallback).catch(fallback);
        }
      } catch(e) {
        fallback();
      }
    })
  }

  private async listDevices(): Promise<any[]> {
    const devices = await this.listAllDevice();
    console.log("having devices", devices);
    return devices.filter(port => isARecognizedDevice(port));
  }

  private async listOnlyKnownDevices(): Promise<any[]> {
    const devices = await this.listAllDevice();
    return devices.filter(port => isARecognizedKnownDevice(port));
  }

  public async systemDevices(): Promise<SerialDevice[]> {
    const devices = await this.listAllDevice();
    return devices.filter(port => ({manufacturer: port.manifacturer, path: port.serial}));
  }
}