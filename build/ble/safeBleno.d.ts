/// <reference types="node" />
declare function log(data: any): void;
export declare const logBLE: typeof log;
export interface SetServiceCallback {
    (err: any): any;
}
export interface BLECallback {
    (result: number, buffer: Buffer): void;
}
export interface BLEWriteCallback {
    (value: string): Promise<boolean>;
}
export declare class SafePrimaryService {
}
export declare class SafeCharacteristics {
    constructor(json: any);
    onReadRequest(offset: number, cb: BLECallback): void;
}
export declare const startAdvertising: (id: string, uuids: string[], callback: (error: any) => void) => void;
export declare const stopAdvertising: () => void;
export declare const setServices: (services: SafePrimaryService[], callback: SetServiceCallback) => void;
export declare const onBlenoEvent: (name: string, callback: any) => void;
export declare const mtu: () => number;
export interface GenericInterface<T> {
    new (something: any): T;
}
export declare const PrimaryService: GenericInterface<SafePrimaryService>;
export declare const Characteristic: GenericInterface<SafeCharacteristics>;
export declare const Descriptor: any;
export declare const isBlenoAvailable: boolean;
export declare const needBluetoothRepair: boolean;
export {};
