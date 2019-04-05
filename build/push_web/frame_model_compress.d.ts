import { Device } from './device_model';
import Abstract from "../database/abstract.js";
export interface Transaction {
    id?: number;
    frame: string;
    timestamp: number;
    sent: number;
}
export default class FrameModel extends Abstract {
    static instance: FrameModel;
    constructor();
    getModelName(): string;
    hasData(device: Device, timestamp_in_past: number): Promise<any[]>;
    canSave(contactair: string): void;
    flushContactair(contactair: string): void;
    getRelevantByte(frame: string): string;
    getCompressedFrame(frame: string): string;
    getInternalSerial(frame: string): string;
    getContactair(frame: string): string;
    getMinFrame(): Promise<number>;
    getMaxFrame(): Promise<number>;
    getFrame(index: number, limit: number): Promise<Transaction[] | undefined>;
    beforeForDevice(device: Device, timestamp: number): Promise<Transaction[]>;
    before(timestamp: number): Promise<Transaction[]>;
    saveMultiple(txs: Transaction[]): Promise<Transaction[]>;
    save(tx: Transaction): Promise<Transaction>;
}
