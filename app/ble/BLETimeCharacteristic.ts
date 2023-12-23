
import {
  RESULT_SUCCESS,
  RESULT_INVALID_OFFSET,
  RESULT_ATTR_NOT_LONG,
  RESULT_INVALID_ATTRIBUTE_LENGTH,
  RESULT_UNLIKELY_ERROR
} from "./BLEConstants";
import { Characteristic, BLECallback } from "./safeBleno";
import { BLEResultCallback } from "./BLESyncCharacteristic";

export class BLETimeCharacteristic extends Characteristic {
  constructor(uuid:string) {
    super({
      uuid: uuid,
      properties: [ 'write', 'read' ]
    });
  }

  onReadRequest(offset: number, cb: BLECallback) {
    cb(RESULT_SUCCESS, Buffer.from(JSON.stringify({
      timestampms: Date.now()
    }), "utf-8"));
  }
  
  onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: BLEResultCallback) {
    //TODO : add management to force a default date when loading the routair ?
    callback(RESULT_SUCCESS);
  };
}
