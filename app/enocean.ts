import { EventEmitter } from "events";
import uuidV4 from "uuid/v4";
import SerialPort from "serialport";
import Enocean from "node-enocean";

import config from "./config/enocean";
import EnoceanSend from "./enocean_send";
import { Logger } from "./log";

const enocean = Enocean();
const enocean_send = new EnoceanSend();

function getByte(telegram_byte_str: any, index: any): any {
  return telegram_byte_str[index * 2 ] + telegram_byte_str[index * 2 + 1];
}

function getEEP(rorg: any, rorg_func: any, rorg_type: any): any {
  return (rorg+"-"+rorg_func+"-"+rorg_type).toLowerCase();
}

function mergeJson(output: any, input: any): any {
  for(var key in input) {
    output[key] = input[key];
  }
}

function isFrameToSend(rorg: any): any {
  return ["a5", "f6", "d5", "d2", "d1"].filter(function(e) {
    return e === rorg;
  }).length > 0;
}

function getDevicesKnown(callback: any): any {
  enocean.getSensors((sensors: any) => {
    callback(sensors);
  });
}

function isARecognizedDevice(port: any) {
  if(port.manufacturer !== undefined) {
    var found = ["ftdi", "enocean"].filter(function(element) {
      return port.manufacturer.toLowerCase().indexOf(element) >= 0;
    });
    return found.length > 0;
  }
  return false;
}

export default class EnoceanLoader extends EventEmitter {
  open_device: any = undefined;
  port: any|undefined;

  constructor() {
    super();

    enocean.on("ready", () => {
      this.emit("usb-open", this.port);
      console.log("-");
    });
  
    enocean.on("data", (data: any) => {
      try{
        enocean.info(data.senderId, (sensor: any) => this.onLastValuesRetrieved(sensor, (sensor == undefined ? {} : undefined), data));
      }catch(e){
        console.log(e)
      }
    });
  
    enocean.on("learned", (data: any) => {
      enocean.getSensors((sensors: any) => {
        this.emit("new_learned_list", sensors);
      });
    });
  
    enocean.on("unknown-teach-in", (data: any) => {
      console.log("found a frame of teach in", data);
    });
  
    enocean.on("error", (err: any) => {
      this.checkEventClose(this);
    });

    enocean.on("disconnect", (e: any, ee: any) => {
      this.checkEventClose(this);
    });
  
    enocean.connect("mongodb://localhost/snmp_memory");

    setInterval(() => {
      this.readDevices()
    }, 2000);

    this.register(this);
  }

  register(listener: any) {
    enocean.register(this);
    enocean.emitters.push(this);
    this.on("get-usb-state", () => {
      if(this.open_device == undefined) {
        this.emit("usb-state", "off");
      }else{
        this.emit("usb-state", "on");
      }
    })
  }

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
          var resolved = enocean.eepResolvers.find((func: any) => {
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
            output.rawDataStr = data.raw;
            output.rawFrameStr = data.rawByte;
          }else{
            output.rawDataStr = data.raw;
            output.rawFrameStr = data.rawByte;
          }

          console.log(output);

          //log the input enocean for the given device
          Logger.identity(output);

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

      enocean.listen(port.comName);
    } catch(e) {

    }
  }

  readDevices() {
    if(this.open_device === undefined) {
      if(config.enocean_endpoint != null) {
        this.openDevice({ comName: config.enocean_endpoint });
      } else {
        SerialPort.list((err: any, ports: any) => {
          ports.forEach((port: any) => {
            if( isARecognizedDevice(port)) {
              this.openDevice(port);
            }
          });
        });
      }
    }
  }
}