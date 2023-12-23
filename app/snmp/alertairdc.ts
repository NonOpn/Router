import AbstractDevice, { Filter, OID } from "./abstract";
import os from "os";
import { Transaction } from "../push_web/frame_model";
import FrameModelCompress from "../push_web/frame_model_compress";

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

  static isConnected(frame: string) {
    if(!frame || frame.length == 0) return false;
    const buffer = new Buffer(frame, "hex");
    if(buffer.length >= 10) {
      const disconnect = (buffer[9] & 2) === 2;
      if(disconnect) return false;
    }
    return true;
  }

  static isCircuitDisconnect(frame: string) {
    if(!frame || frame.length == 0) return false;
    const buffer = new Buffer(frame, "hex");
    if(buffer.length >= 10) {
      const striken = (buffer[9] & 1) === 0;
      if(striken) return true;
    }
    return false;
  }

  getConnectedStateString(compressed: string|undefined): string {
    const connected = compressed ? AlertairDC.isConnected(compressed) : false;
    return connected ? "connected" : "disconnected";
  }

  getImpactedString(compressed: string|undefined): string {
    const circuit_disconnected = compressed ? AlertairDC.isCircuitDisconnect(compressed) : false;
    return circuit_disconnected ? "circuit_disconnect" : "circuit_normal";
  }

  protected format_frame(transaction: Transaction, compressed: string){
    return {
      d: transaction.timestamp,
      c: !!AlertairDC.isConnected(compressed),
      a: !!AlertairDC.isCircuitDisconnect(compressed),
      s: !!transaction.sent
    }
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
        handler: (prq: any) => {
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