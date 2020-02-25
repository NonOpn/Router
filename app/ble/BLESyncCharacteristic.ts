
import {
  RESULT_SUCCESS,
  RESULT_INVALID_OFFSET,
  RESULT_ATTR_NOT_LONG,
  RESULT_INVALID_ATTRIBUTE_LENGTH,
  RESULT_UNLIKELY_ERROR
} from "./BLEConstants";
import { Characteristic, BLECallback, BLEWriteCallback, PrimaryService, isBlenoAvailable, startAdvertising, setServices, onBlenoEvent, stopAdvertising } from "./safeBleno";
import FrameModelCompress from "../push_web/frame_model_compress";
import { Transaction } from "../push_web/frame_model";

export interface BLEResultCallback {
  (result: number): void;
}

export interface Compressed {
  i: number,
  f: string, //compressed frame
  t: number, //timestamp
  s: string, //internal serial
  c: string //contactair
}

export interface Result {
  index: number,
  max: number,
  txs: string[] //previously was Compressed
}

interface Payload {
  index: number,
  payload: string
}

export class BLELargeSyncCharacteristic extends Characteristic {
  constructor(uuid:string, private max: number, private compress: boolean, private use_write: boolean, private mtu: () => number) {
    super({
      uuid: uuid,
      properties: use_write ? [ 'write', 'read' ] : ['read']
    });
  }

  public numberToFetch(): number {
    return this.max;
  }

  public getMaxFrame(): Promise<number> {
    return Promise.resolve(-1);
  }

  public getMinFrame(): Promise<number> {
    return Promise.resolve(-1);
  }

  public getFrame(value: number, to_fetch: number): Promise<Transaction[]|undefined> {
    return Promise.resolve([]);
  }

  private _obtained: Buffer|undefined;
  private _last_offset = 0;
  _log_id:number = 0;

  private transform(transaction: Transaction): Payload {
    var payload: string = "";
    if(this.compress) {
      payload = [transaction.id,
        FrameModelCompress.instance.getCompressedFrame(transaction.frame),
        transaction.timestamp,
        FrameModelCompress.instance.getInternalSerial(transaction.frame),
        FrameModelCompress.instance.getContactair(transaction.frame)
      ].join(",");
      payload=`[${payload}]`;
    } else {
      payload = JSON.stringify({
        i: transaction.id,
        f: FrameModelCompress.instance.getCompressedFrame(transaction.frame),
        t: transaction.timestamp,
        s: FrameModelCompress.instance.getInternalSerial(transaction.frame),
        c: FrameModelCompress.instance.getContactair(transaction.frame)
      });
    }

    return {index: transaction.id || 0, payload};
  }

  private fromPayload(payload: string): any {
    if(this.compress) {
      return payload;
    }
    return JSON.parse(payload);
  }

  private _callback(): Promise<any> {
    const index = this._log_id;

    var result: Result = { index, max: 0, txs: [] };
    var to_fetch = 1;
    var TO_FETCH_MAXIMUM = this.numberToFetch();

    return this.getMaxFrame()
    .then(maximum => {
      result.max = maximum;

      if(this._log_id > maximum) {
        this._log_id = maximum + 1; //prevent looping
      }

      return this.getMinFrame();
    })
    .then(minimum => {
      //check the minimum index to fetch values from
      if(minimum > this._log_id) this._log_id = minimum;
      return minimum > index ? minimum : index
    })
    .then(value => {
      //get at least 1..4 transactions
      to_fetch = result.max - value;
      if(to_fetch > TO_FETCH_MAXIMUM) to_fetch = TO_FETCH_MAXIMUM;
      if(to_fetch < 1) to_fetch = 1;

      this._log_id += to_fetch;

      return value;
    })
    .then(value => this.getFrame(value, to_fetch))
    .then((transactions: Transaction[]|undefined) => {
      if(!transactions) transactions = [];

      const payloads: Payload[] = transactions.map((transaction: any) => this.transform(transaction));

      const copy: Payload[] = [];
      var idx: number = 0;
      var count: number = 0;
      while(idx < payloads.length && count < 450) { //TODO strip this magic number off...
        const {payload} = payloads[idx];
        if(payload.length + count < 450) {
          copy.push(payloads[idx]);
        }
        //add the size to stop it
        count += payload.length;
        idx++;
      }

      if(copy.length > 0) result.index = copy[copy.length - 1].index;
      result.txs = copy.map(p => this.fromPayload(p.payload));

      if(this._log_id > result.max + 1) this._log_id = result.max + 1;
      return JSON.stringify(result);
    });
  }

  private readOrSend(offset: number): Promise<Buffer> {
    if(offset > 0 && this._last_offset <= offset) {
      return new Promise((resolve) => {
        this._last_offset = offset;
        resolve(this._obtained);
      });
    }
    return this._callback()
    .then(value => {
      this._obtained = Buffer.from(value, "utf-8");
      this._last_offset = offset;
      return this._obtained;
    });
  }

  onReadRequest(offset: number, cb: BLECallback) {
    const length = this._obtained ? this._obtained.length : 0;
    this.readOrSend(offset)
    .then(buffer => {
      const current_mtu = Math.max(0, this.mtu() - 4);
      

      if(current_mtu >= buffer.byteLength - offset) {

      }
      cb(RESULT_SUCCESS, buffer.slice(offset));
    });
  }
  
  onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: BLEResultCallback) {
    var config: string = data.toString();
    var configuration: any = {};
    try {
      configuration = JSON.parse(config);
    } catch(e) {
      configuration = {};
    }

    if(configuration && configuration.index) {
      this._log_id = configuration.index;
      callback(RESULT_SUCCESS);
    } else {
      callback(RESULT_UNLIKELY_ERROR);
    }
  };
}