import AbstractDevice, { Filter, OID } from "./abstract";
import { Transaction } from '../push_web/frame_model';
import FrameModelCompress from '../push_web/frame_model_compress';

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

  getConnectedStateString(compressed: string|undefined): string {
    if(!compressed) return " ";
    const buffer = new Buffer(compressed, "hex");
    if(buffer.length >= 4) {
      const disconnect = (buffer[3] & 2) === 2;
      if(disconnect) return "disconnected";
    }
    return "connected";
  }

  getImpactedString(compressed: string|undefined): string {
    if(!compressed) return " ";
    const buffer = new Buffer(compressed, "hex");
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
      }
    ];
  }
}
