/// <reference types="node" />
export default class BLE {
    private _notify_frame?;
    private _characteristics;
    private _ble_service;
    private _system_service;
    private _eth0_service;
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
    refreshDevices(): void;
    start(): void;
    startDelayed(): void;
    onFrame(frame: any): void;
    _onDeviceSeenCall(): Promise<string>;
    json(value: string): any;
    _onNetwork(value: string): Promise<boolean>;
    _onWifi(value: string): Promise<boolean>;
}
