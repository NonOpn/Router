export interface DataPointModel {
    serial: string;
    internal: string;
    contactair: string;
    data: string;
    created_at: Date;
}
export default class DataPoint {
    static instance: DataPoint;
    constructor();
    savePoint(serial: string, internal: string, contactair: string, data: string): Promise<DataPointModel>;
    latestForContactair(contactair: string): Promise<DataPointModel>;
    latestForSerial(serial: string): Promise<DataPointModel>;
    latestForInternal(internal: string): Promise<DataPointModel>;
    findLatestWithParams(params: any): Promise<DataPointModel>;
    queryWithParams(params: any): any;
}
