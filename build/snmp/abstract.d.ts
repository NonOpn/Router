import { Transaction } from './../push_web/frame_model';
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
export default abstract class AbstractDevice {
    agent: any | undefined;
    params: any | undefined;
    snmp: any | undefined;
    data_point_provider: DataPoint;
    constructor();
    setParams(params: any): void;
    json(): {
        id: number;
        internal: any;
        serial: any;
        type: any;
    };
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
    getAdditionnalInfo1String(item: DataPointModel | undefined): string;
    getAdditionnalInfo2String(item: DataPointModel | undefined): string;
    getLPSFR(): any;
    getLatest(): Promise<DataPointModel | undefined>;
    getLatestFrames(): Promise<Transaction[]>;
    getLatestAlertFrames(): Promise<Transaction[]>;
    getFormattedLatestAlertFrames(): Promise<any[]>;
    getFormattedLatestFrames(): Promise<any[]>;
    protected getFormatted(callback: () => Promise<Transaction[]>): Promise<any[]>;
    protected abstract format_frame(transaction: Transaction, compressed: string): void;
    getLatestAlertFramesAsString(): Promise<string>;
    getLatestFramesAsString(): Promise<string>;
    getAdditionnalInfo1(): Promise<string>;
    getAdditionnalInfo2(): Promise<string>;
    getLatests(): Promise<string>;
    getConnectedState(): Promise<string>;
    getImpactedState(): Promise<string>;
    getStandardFilter(): Filter;
    asMib(): any;
    sendString(prq: any, string: string): void;
    bind(): void;
}
