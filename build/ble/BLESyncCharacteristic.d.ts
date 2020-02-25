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
    txs: string[];
}
export declare class BLELargeSyncCharacteristic extends Characteristic {
    private max;
    private compress;
    private use_write;
    private mtu;
    constructor(uuid: string, max: number, compress: boolean, use_write: boolean, mtu: () => number);
    numberToFetch(): number;
    getMaxFrame(): Promise<number>;
    getMinFrame(): Promise<number>;
    getFrame(value: number, to_fetch: number): Promise<Transaction[] | undefined>;
    private _obtained;
    private _last_offset;
    _log_id: number;
    private transform(transaction);
    private fromPayload(payload);
    private _callback();
    private readOrSend(offset);
    onReadRequest(offset: number, cb: BLECallback): void;
    onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: BLEResultCallback): void;
}
