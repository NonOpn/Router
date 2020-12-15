import { Device } from './device_model';
import Abstract from "../database/abstract.js";
export interface Transaction {
    id?: number;
    frame: string;
    timestamp: number;
    sent: number;
    is_alert?: boolean;
    is_alert_disconnected?: boolean;
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
    /**
     * Get the lowest rssi obtained (the number are positiv, so need to multiply by -1)
     * @param count the number of frame to count from
     */
    getLowestSignal(count: number): Promise<number>;
    getContactair(frame: string): string;
    getSignal(frame: string): number;
    getMinFrame(): Promise<number>;
    getMaxFrame(): Promise<number>;
    getCount(): Promise<number>;
    invalidateAlerts(product_id: number): Promise<boolean>;
    setDevice(index: number, product_id: number, is_alert?: boolean, is_alert_disconnect?: boolean): Promise<boolean>;
    getFrame(index: number, limit: number): Promise<Transaction[] | undefined>;
    lasts(product_id: number, limit: number): Promise<Transaction[]>;
    getFrameIsAlert(index: number, limit: number): Promise<Transaction[] | undefined>;
    isLastDisconnectedState(product_id: number, before_index: number): Promise<boolean>;
    beforeForDevice(device: Device, timestamp: number): Promise<Transaction[]>;
    before(timestamp: number): Promise<Transaction[]>;
    getMaximumUnsent: () => number;
    getUnsent(maximum?: number): Promise<Transaction[]>;
    saveMultiple(txs: Transaction[]): Promise<Transaction[]>;
    save(tx: Transaction): Promise<Transaction>;
}
