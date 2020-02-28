import { Device } from './device_model';
import Abstract from "../database/abstract.js";
export interface Transaction {
    id?: number;
    frame: string;
    timestamp: number;
    sent: number;
}
export default class FrameModelCompress extends Abstract {
    static instance: FrameModelCompress;
    constructor();
    getModelName(): string;
    hasData(device: Device, timestamp_in_past: number): Promise<any[]>;
    invalidateAlerts(product_id: number): Promise<boolean>;
    getRelevantByte(frame: string): string;
    getFrameWithoutHeader(frame: string): string;
    getCompressedFrame(frame: string): string;
    getInternalSerial(frame: string): string;
    getContactair(frame: string): string;
    getMinFrame(): Promise<number>;
    getMaxFrame(): Promise<number>;
    getFrame(index: number, limit: number): Promise<Transaction[] | undefined>;
    _contactair_cache: never[];
    _syncing: boolean;
    _temp_syncing: any[];
    start(): void;
    flushAwaiting(): void;
    save(tx: Transaction, force?: boolean): Promise<Transaction>;
}
