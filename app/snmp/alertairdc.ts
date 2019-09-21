import AbstractDevice, { Filter, OID } from "./abstract";
import os from "os";
import { DataPointModel } from "../database/data_point";

export default class AlertairDC extends AbstractDevice {
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

  getConnectedStateString(item: DataPointModel|undefined): string {
    if(!item || !item.data) return " ";
    const buffer = new Buffer(item.data, "hex");
    if(buffer.length >= 16) {
      const disconnect = (buffer[9] & 2) === 2;
      if(disconnect) return "disconnect";
    }
    return "connected";
  }

  getImpactedString(item: DataPointModel|undefined): string {
    if(!item || !item.data) return " ";
    const buffer = new Buffer(item.data, "hex");
    if(buffer.length >= 16) {
      const disconnect = (buffer[9] & 1) === 0;
      if(disconnect) return "circuit_disconnect";
    }
    return "circuit_normal";
  }

  asMib(): OID[] {
    return [
      {
        oid: this.params.oid+".1",
        handler: (prq: any) => {
          this.sendString(prq, this.params.lpsfr.serial);
        }
      },
      {
        oid: this.params.oid+".2",
        handler: (prq: any) => {
          var nodename = os.hostname();
          this.sendString(prq, this.params.lpsfr.internal);
        }
      },
      {
        oid: this.params.oid+".3",
        handler: (prq: any) => {
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
        handler: (prq: any) => {
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
        handler: (prq: any) => {
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
        handler: (prq: any) => {
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