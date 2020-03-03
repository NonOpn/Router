/// <reference types="node" />
import { EventEmitter } from "events";
export default class EnoceanLoader extends EventEmitter {
    open_device: any;
    port: any | undefined;
    constructor();
    register(listener: any): void;
    checkEventClose(caller: any): void;
    onLastValuesRetrieved(sensor_data: any, err: any, data: any): void;
    openDevice(port: any): void;
    readDevices(): void;
}
