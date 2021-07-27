import os from 'os';
import { DataPointModel } from './../database/data_point';
import AbstractDevice, { Filter, OID } from "./abstract";
import { Transaction } from '../push_web/frame_model';

export default class Comptair extends AbstractDevice {
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

  static isStriken(frame: string) {
    if(!frame || frame.length == 0) return false;
    const buffer = new Buffer(frame, "hex");
    if(buffer.length >= 10) {
      const striken = (buffer[9] & 1) === 0;
      if(striken) return true;
    }
    return false;
  }

  getConnectedStateString(item: DataPointModel|undefined): string {
    const connected = item ? Comptair.isConnected(item.data) : false;
    return connected ? "connected" : "disconnect";
  }

  getImpactedString(item: DataPointModel|undefined): string {
    const connected = item ? Comptair.isStriken(item.data) : false;
    return connected ? "striken" : "normal";
  }

  protected format_frame(transaction: Transaction, compressed: string){
    return {
      d: transaction.timestamp,
      c: Comptair.isConnected(compressed),
      a: Comptair.isStriken(compressed),
      s: !!transaction.sent
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