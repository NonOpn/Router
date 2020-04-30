export interface DataPointModel {
    id?: number;
    serial: string;
    internal: string;
    contactair: string;
    enocean_relay: string;
    data: string;
    created_at: Date;
}
export default class DataPoint {
    static instance: DataPoint;
    constructor();
    savePoint(serial: string, internal: string, contactair: string, data: string): Promise<DataPointModel>;
    latestForContactair(contactair: string): Promise<DataPointModel | undefined>;
    latestForSerial(serial: string): Promise<DataPointModel | undefined>;
    latestForInternal(internal: string): Promise<DataPointModel | undefined>;
    findMatching(key: string, value: string): Promise<DataPointModel | undefined>;
}
