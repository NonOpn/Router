import { Device } from './device_model';
import Abstract from "../database/abstract.js";
export interface Transaction {
    id?: number;
    frame: string;
    timestamp: number;
    sent: number;
    is_alert?: boolean;
    product_id?: number | null | undefined;
}
export default class FrameModel extends Abstract {
    static instance: FrameModel;
    constructor();
    getModelName(): string;
    from(frame: string, sent?: number): Transaction;
    setSent(id: number, sent: number | boolean): Promise<Transaction | undefined>;
    hasData(device: Device, timestamp_in_past: number): Promise<any[]>;
    getCompressedFrame(frame: string): string;
    getInternalSerial(frame: string): string;
    getContactair(frame: string): string;
    getMinFrame(): Promise<number>;
    getMaxFrame(): Promise<number>;
    setDevice(index: number, product_id: number, is_alert?: boolean): Promise<boolean>;
    getFrame(index: number, limit: number): Promise<Transaction[] | undefined>;
    beforeForDevice(device: Device, timestamp: number): Promise<Transaction[]>;
    before(timestamp: number): Promise<Transaction[]>;
    getUnsent(): Promise<Transaction[]>;
    saveMultiple(txs: Transaction[]): Promise<Transaction[]>;
    save(tx: Transaction): Promise<Transaction>;
}
