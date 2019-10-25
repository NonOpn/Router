import { DataPointModel } from '../database/data_point';
import DataPoint from "../database/data_point";
export interface Filter {
    key: string;
    value: string;
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
    getType(): Promise<string>;
    setType(type?: string): Promise<boolean>;
    _getPromiseCharacteristic(name: string): Promise<any>;
    _setPromiseCharacteristic(name: string, value: string): Promise<boolean>;
    getSyncInternalSerial(): string | undefined;
    getConnectedStateString(item: DataPointModel | undefined): string;
    getImpactedString(item: DataPointModel | undefined): string;
    getLPSFR(): any;
    getLatest(): Promise<DataPointModel | undefined>;
    getConnectedState(): Promise<string>;
    getImpactedState(): Promise<string>;
    getStandardFilter(): Filter;
    asMib(): any;
    sendString(prq: any, string: string): void;
    bind(): void;
}
