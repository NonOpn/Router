/// <reference types="node" />
import { EventEmitter } from "events";
declare class EnoceanDevice extends EventEmitter {
    enocean: any;
    open_device: any;
    port: any | undefined;
    constructor(port: any);
    init(): void;
    isOpen: () => boolean;
    checkEventClose(caller: any): void;
    onLastValuesRetrieved(sensor_data: any, err: any, data: any): void;
    openDevice(port: any): void;
}
export default class EnoceanLoader extends EventEmitter {
    devices: EnoceanDevice[];
    started: boolean;
    constructor();
    private openDevice;
    removeDevice(device: EnoceanDevice): void;
    private postNextRead;
    init(): void;
    readDevices(): void;
    private listDevices;
}
export {};
