/// <reference types="node" />
import { Characteristic, PrimaryService } from "./ble/safeBleno";
interface BufferCallback {
    (buffer: Buffer): void;
}
declare class BLEFrameNotify extends Characteristic {
    _value: Buffer;
    _updateFramesCallback: BufferCallback | null;
    constructor(uuid: string, value: any);
    onSubscribe(maxValueSize: number, callback: BufferCallback): void;
    onUnsubscribe(): void;
    onFrame(frame: any): void;
}
declare class BLEPrimaryService extends PrimaryService {
    constructor(characteristics: any[]);
}
declare class BLEPrimarySystemService extends PrimaryService {
    constructor(uuid: string);
}
declare class BLEPrimaryNetworkService extends PrimaryService {
    constructor(uuid: string, name: string, intfs: string[]);
}
export default class BLE {
    _notify_frame: BLEFrameNotify;
    _characteristics: any[];
    _ble_service: BLEPrimaryService;
    _system_service: BLEPrimarySystemService;
    _eth0_service: BLEPrimaryNetworkService;
    _wlan0_service: BLEPrimaryNetworkService;
    _services: any[];
    _services_uuid: string[];
    _refreshing_called_once: boolean;
    _started_advertising: boolean;
    _started: boolean;
    _started_advertising_ok: boolean;
    _interval: NodeJS.Timeout | undefined;
    constructor();
    refreshDevices(): void;
    start(): void;
    startDelayed(): void;
    onFrame(frame: any): void;
    _onDeviceSeenCall(): Promise<string>;
    json(value: string): any;
    _onNetwork(value: string): Promise<boolean>;
    _onWifi(value: string): Promise<boolean>;
}
export {};
