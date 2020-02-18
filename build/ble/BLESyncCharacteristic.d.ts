import { Characteristic, BLECallback } from "./safeBleno";
import { Transaction } from "../push_web/frame_model";
export interface BLEResultCallback {
    (result: number): void;
}
export interface Compressed {
    i: number;
    f: string;
    t: number;
    s: string;
    c: string;
}
export interface Result {
    index: number;
    max: number;
    txs: Compressed[];
}
export default class BLESyncCharacteristic extends Characteristic {
    _log_id: number;
    _last: Buffer;
    _compress: boolean;
    constructor(uuid: string, compress?: boolean, use_write?: boolean);
    getMaxFrame(): Promise<number>;
    getMinFrame(): Promise<number>;
    getFrame(value: number, to_fetch: number): Promise<Transaction[] | undefined>;
    onReadRequest(offset: number, cb: BLECallback): void;
    onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: BLEResultCallback): void;
}
