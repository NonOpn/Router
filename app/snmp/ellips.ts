import { DataPointModel } from './../database/data_point';
import AbstractDevice, { Filter, OID } from "./abstract";
import { Transaction } from '../push_web/frame_model';

export default class Ellips extends AbstractDevice {
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
    if(buffer.length >= 4) {
      const disconnect = (buffer[3] & 2) === 2;
      if(disconnect) return "disconnect";
    }
    return "connected";
  }

  getImpactedString(item: DataPointModel|undefined): string {
    if(!item || !item.data) return " ";
    const buffer = new Buffer(item.data, "hex");
    if(buffer.length >= 4) {
      const disconnect = (buffer[3] & 1) === 0;
      if(disconnect) return "striken";
    }
    return "normal";
  }

  protected format_frame(transaction: Transaction, compressed: string){
    return {
      d: transaction.timestamp,
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
      }
    ];
  }
}
