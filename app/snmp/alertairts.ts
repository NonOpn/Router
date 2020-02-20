import os from 'os';
import { DataPointModel } from './../database/data_point';
import AbstractDevice, { Filter, OID } from "./abstract";

export enum Detection {
  NORMAL = 0,
  CALIBRATION_OK = 1,
  DISTURBING = 2,
  NOISE = 3,
  FAR = 4,
  APPROACHING = 5,
  CLOSE_STRIKE = 6,
  STABLE_STORM = 7,
  DEPARTING = 8,
  ARRIVAL = 9
}

export default class AlertairTS extends AbstractDevice {
  constructor(params: any) {
    super();
    this.setParams(params);
  }

  getStandardFilter(): Filter {
    return {
      key: "serial",
      value: this.params.lpsfr.serial
    };
  }

  static isConnected(frame: string) {
    if(!frame || frame.length == 0) return false;
    const buffer = new Buffer(frame, "hex");
    if(buffer.length >= 10) {
      const disconnect = (buffer[9] & 2) === 2;
      if(disconnect) return false;
    }
    return true;
  }

  static isAlert(frame: string): boolean {
    const buffer = new Buffer(frame, "hex");
    if(buffer.length >= 6) {
      var detection: number = (buffer[5] >> 4);
      console.log("frame >> " + frame+" // " + frame[10]+frame[11]);
      console.log("ALERTAIR TS", "detection ??? " + detection);
      switch(detection) {
          case Detection.ARRIVAL:
          case Detection.DEPARTING:
          case Detection.STABLE_STORM:
          case Detection.CLOSE_STRIKE:
          case Detection.APPROACHING:
          case Detection.FAR:
            return true;
          case Detection.NOISE:
          case Detection.DISTURBING:
            return true;
          case Detection.CALIBRATION_OK:
          case 0:
          default:
            return false;
      }
    }
    return false;
  }

  getConnectedStateString(item: DataPointModel|undefined): string {
    const connected = item ? AlertairTS.isConnected(item.data) : false;
    return connected ? "connected" : "disconnect";
  }

  getImpactedString(item: DataPointModel|undefined): string {
    if(!item || !item.data) return "safe";
    if(item.data.indexOf("ffffff") == 0) return "alert";
    const alert = AlertairTS.isAlert(item.data);
    return alert ? "alert" : "safe";
  }

  getAdditionnalInfo1String(item: DataPointModel|undefined): string {
    return this.getDistance(item);
  }

  getAdditionnalInfo2String(item: DataPointModel|undefined): string {
    return this.getDetectionType(item);
  }

  getDistance(item: DataPointModel|undefined): string {
    if(!item || !item.data) return "-2";
    const buffer = new Buffer(item.data, "hex");
    if(buffer.length >= 16) {
      var distance: number = buffer[4];
      if(distance < 0) distance = 0;
      if(distance > 40) distance = 40;
      return ""+distance;
    }
    return "-1";
  }

  getDetectionType(item: DataPointModel|undefined): string {
    if(!item || !item.data) return "-2";
    const buffer = new Buffer(item.data, "hex");
    if(buffer.length >= 16) {
      var detection: number = (buffer[5] >> 4);
      switch(detection) {
          case 9: return this.detectionStr(Detection.ARRIVAL);
          case 8: return this.detectionStr(Detection.DEPARTING);
          case 7: return this.detectionStr(Detection.STABLE_STORM);
          case 6: return this.detectionStr(Detection.CLOSE_STRIKE);
          case 5: return this.detectionStr(Detection.APPROACHING);
          case 4: return this.detectionStr(Detection.FAR);
          case 3: return this.detectionStr(Detection.NOISE);
          case 2: return this.detectionStr(Detection.DISTURBING);
          case 1: return this.detectionStr(Detection.CALIBRATION_OK);
          case 0:
          default:
              return this.detectionStr(Detection.NORMAL);
      }
    }
    return "-1";
  }
  
  detectionStr(detection: Detection) {
      switch(detection) {
          case Detection.ARRIVAL: return "arrival";
          case Detection.DEPARTING: return "departing";
          case Detection.STABLE_STORM: return "stable";
          case Detection.CLOSE_STRIKE: return "close";
          case Detection.APPROACHING: return "approaching";
          case Detection.FAR: return "far";
          case Detection.NOISE: return "noise";
          case Detection.DISTURBING: return "disturbing";
          case Detection.CALIBRATION_OK: return "cal_ok";
          default: return "normal";
      }
  }

  asMib(): OID[] {
    return [
      {
        oid: this.params.oid+".1",
        handler: (prq) => {
          this.sendString(prq, this.params.lpsfr.serial);
        }
      },
      {
        oid: this.params.oid+".2",
        handler: (prq) => {
          var nodename = os.hostname();
          this.sendString(prq, this.params.lpsfr.internal);
        }
      },
      {
        oid: this.params.oid+".3",
        handler: (prq) => {
          this.getLatest()
          .then(item => {
            this.sendString(prq, item ? item.created_at.toString() : "");
          })
          .catch(err => {
            console.log(err);
            this.sendString(prq, err);
          })
        }
      },
      {
        oid: this.params.oid+".4",
        handler: (prq) => {
          this.getLatest()
          .then(item => {
            const behaviour = this.getConnectedStateString(item);
            this.sendString(prq, behaviour);
          })
          .catch(err => {
            console.log(err);
            this.sendString(prq, err);
          })
        }
      },
      {
        oid: this.params.oid+".5",
        handler: (prq) => {
          this.getLatest()
          .then(item => {
            const string = this.getImpactedString(item);
            this.sendString(prq, string);
          })
          .catch(err => {
            console.log(err);
            this.sendString(prq, err);
          })
        }
      },
      {
        oid: this.params.oid+".6",
        handler: (prq) => {
          this.getLatest()
          .then(item => {
            this.sendString(prq, item ? item.data : "");
          })
          .catch(err => {
            console.log(err);
            this.sendString(prq, err);
          })
        }
      }
    ];
  }
}