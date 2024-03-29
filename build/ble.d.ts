/// <reference types="node" />
import AbstractDevice from "./snmp/abstract";
export default class BLE {
    private _notify_frame?;
    private _characteristics;
    private _ble_service;
    private _system_service;
    private _eth0_service;
    private _eth1_service;
    private _wlan0_service;
    private _services;
    private _services_uuid;
    _refreshing_called_once: boolean;
    _started_advertising: boolean;
    _started: boolean;
    _started_advertising_ok: boolean;
    _interval: NodeJS.Timeout | undefined;
    constructor();
    needRepair(): boolean;
    refreshDevices: () => Promise<void>;
    start(): void;
    onStateChanged: (state: string) => void;
    startDelayed(): void;
    onFrame(device: AbstractDevice | undefined, frame: any): void;
    private _getPendingCalculations;
    _onDeviceSeenCall(): Promise<string>;
    json(value: string): any;
    _onNetwork(value: string): Promise<boolean>;
    _onWifi(value: string): Promise<boolean>;
}
