import os from 'os';
import { DataPointModel } from './../database/data_point';
import AbstractDevice, { Filter, OID } from "./abstract";
import { Transaction } from '../push_web/frame_model';
import FrameModelCompress from '../push_web/frame_model_compress';

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

  static distance(frame: string): number {
    const buffer = new Buffer(frame, "hex");
    if(buffer.length >= 5) {
      var distance: number = buffer[4];
      if(distance < 0) distance = -1;
      if(distance > 40) distance = 40;
      return distance;
    }
    return -1;
  }

  static detectionType(frame: string): Detection {
    const buffer = new Buffer(frame, "hex");
    if(buffer.length >= 6 && this.isConnected(frame)) {
      var detection: number = (buffer[5] >> 4);
      return detection;
    }
    return Detection.NORMAL;
  }

  static isAlert(frame: string): boolean {
    const buffer = new Buffer(frame, "hex");
    if(buffer.length >= 6 && this.isConnected(frame)) {
      var detection: number = AlertairTS.detectionType(frame);
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
          case Detection.CALIBRATION_OK:
          case 0:
          default:
            return false;
      }
    }
    return false;
  }

  getConnectedStateString(compressed: string|undefined): string {
    const connected = compressed ? AlertairTS.isConnected(compressed) : false;
    return connected ? "connected" : "disconnected";
  }

  getImpactedString(compressed: string|undefined): string {
    if(!compressed) return "safe";
    if(compressed.indexOf("ffffff") == 0) return "alert";
    const alert = AlertairTS.isAlert(compressed);
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
    return "" + AlertairTS.distance(item.data);
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

  protected format_frame(transaction: Transaction, compressed: string){
    return {
      d: transaction.timestamp,
      c: !!AlertairTS.isConnected(compressed),
      a: !!AlertairTS.isAlert(compressed),
      s: !!transaction.sent,
      t: AlertairTS.detectionType(compressed),
      km: AlertairTS.distance(compressed)
    }
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
          this.getLatestButAsTransaction()
          .then(transaction => {
            const compressed = transaction ? FrameModelCompress.instance.getFrameWithoutHeader(transaction.frame)
              : undefined;
            const behaviour = this.getConnectedStateString(compressed);
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
          this.getLatestButAsTransaction()
          .then(transaction => {
            const compressed = transaction ? FrameModelCompress.instance.getFrameWithoutHeader(transaction.frame)
              : undefined;
            const string = this.getImpactedString(compressed);
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