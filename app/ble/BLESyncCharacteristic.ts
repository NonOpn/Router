
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
  txs: Compressed[]
}

export default class BLESyncCharacteristic extends Characteristic {
  _log_id:number = 0;
  _last: Buffer;
  _compress: boolean;

  constructor(uuid: string, compress:boolean = false, use_write: boolean = true) {
    super({
      uuid: uuid,
      properties: use_write ? [ 'write', 'read' ] : ['read']
    });

    this._compress = compress;
    this._last = Buffer.from("");
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

  onReadRequest(offset: number, cb: BLECallback) {
    if(offset > 0 && offset < this._last.length) {
      const sub = this._last.subarray(offset);
      cb(RESULT_SUCCESS, sub);
      return;
    }

    console.log(offset);
    const index = this._log_id;
    console.log("get log ", index);

    var result: Result = {
      index: index,
      max: 0,
      txs: []
    };
    var to_fetch = 1;

    this.getMaxFrame()
    .then(maximum => {
      result.max = maximum;

      if(this._log_id > maximum) {
        this._log_id = maximum+1; //prevent looping
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
      if(to_fetch > 7) to_fetch = 7;
      if(to_fetch < 1) to_fetch = 1;

      this._log_id += to_fetch;

      return value;
    })
    .then(value => this.getFrame(value, to_fetch))
    .then(transactions => {

      console.log("new index", this._log_id+" "+result.index);

      if(transactions) {
        transactions.forEach((transaction:any) => {
          result.index = transaction.id;

          if(!this._compress) {
            const arr = {
              i: transaction.id,
              f: FrameModelCompress.instance.getCompressedFrame(transaction.frame),
              t: transaction.timestamp,
              s: FrameModelCompress.instance.getInternalSerial(transaction.frame),
              c: FrameModelCompress.instance.getContactair(transaction.frame)
            };
            result.txs.push(arr);
          } else {
            const arr:any = 
              transaction.id+","+
              FrameModelCompress.instance.getCompressedFrame(transaction.frame)+","+
              transaction.timestamp+","+
              FrameModelCompress.instance.getInternalSerial(transaction.frame)+","+
              FrameModelCompress.instance.getContactair(transaction.frame)+",";
            result.txs.push(arr);
          }
        })
      }

      if(this._log_id > result.max + 1) {
        this._log_id = result.max + 1;
      }
      var output = JSON.stringify(result);
      if(this._compress) {
        output = result.index+","+result.max+","+result.txs.concat();
      }
      this._last = Buffer.from(output, "utf-8");
      cb(RESULT_SUCCESS, this._last);
    })
    .catch(err => {
      console.error(err);
      cb(RESULT_UNLIKELY_ERROR, Buffer.from("", "utf-8"));
    })
  }

  onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: BLEResultCallback) {
    console.log("offset := " + offset);
    console.log(data.toString());
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
