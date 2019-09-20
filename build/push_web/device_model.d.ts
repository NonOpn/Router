import Abstract from "../database/abstract.js";
export interface Device {
    id?: number;
    serial: string;
    internal_serial: string;
    type: number;
}
export default class DeviceModel extends Abstract {
    static instance: DeviceModel;
    constructor();
    getModelName(): string;
    list(): Promise<Device[]>;
    listDevice(): Promise<Device[]>;
    getDeviceForInternalSerial(internal_serial: string): Promise<Device | undefined>;
    getDeviceForSerial(serial: string): Promise<Device | undefined>;
    saveDevice(device: Device): Promise<Device | undefined>;
    saveMultiple(devices: Device[]): Promise<Device[]>;
}
