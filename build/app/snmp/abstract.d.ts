import { DataPointModel } from '../database/data_point';
import DataPoint from "../database/data_point";
export interface Filter {
    serial: string;
}
export interface CallbackOID {
    (prq: any): void;
}
export interface OID {
    oid: string;
    handler: CallbackOID;
}
export default class AbstractDevice {
    agent: any | undefined;
    params: any | undefined;
    snmp: any | undefined;
    data_point_provider: DataPoint;
    constructor();
    setParams(params: any): void;
    getId(): number;
    getUUID(): string;
    getSerial(): Promise<string>;
    getInternalSerial(): Promise<string>;
    getType(): Promise<number>;
    _getPromiseCharacteristic(name: string): Promise<any>;
    getSyncInternalSerial(): string | undefined;
    getConnectedStateString(item: DataPointModel): string;
    getImpactedString(item: DataPointModel): string;
    getLPSFR(): any;
    getLatest(): Promise<DataPointModel>;
    getConnectedState(): Promise<string>;
    getImpactedState(): Promise<string>;
    getStandardFilter(): Filter;
    asMib(): any;
    sendString(prq: any, string: string): void;
    bind(): void;
}
