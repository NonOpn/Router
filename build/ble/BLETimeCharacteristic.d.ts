/// <reference types="node" />
import { Characteristic, BLECallback } from "./safeBleno";
import { BLEResultCallback } from "./BLESyncCharacteristic";
export declare class BLETimeCharacteristic extends Characteristic {
    constructor(uuid: string);
    onReadRequest(offset: number, cb: BLECallback): void;
    onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: BLEResultCallback): void;
}
