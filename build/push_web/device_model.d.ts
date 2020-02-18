import Abstract from "../database/abstract.js";
export interface Device {
    id?: number;
    serial: string;
    internal_serial: string;
    type: number;
    last_contactair?: string;
    last_contactair_index?: number;
}
export default class DeviceModel extends Abstract {
    static instance: DeviceModel;
    constructor();
    getModelName(): string;
    list(): Promise<Device[]>;
    listDevice(): Promise<Device[]>;
    cleanContactair(): Promise<boolean>;
    unsetContactair(last_contactair: string, frame_id: number): Promise<boolean>;
    setContactairForDevice(last_contactair: string, internal_serial: string, frame_id: number): Promise<Device | undefined>;
    getDeviceForInternalSerial(internal_serial: string): Promise<Device | undefined>;
    getDeviceForSerial(serial: string): Promise<Device | undefined>;
    getDeviceForContactair(contactair: string): Promise<Device | undefined>;
    saveType(internal_serial: string, type: number): Promise<{}>;
    saveDevice(device: Device): Promise<Device | undefined>;
    saveMultiple(devices: Device[]): Promise<Device[]>;
}
