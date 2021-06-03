import { Device } from "../push_web/device_model";
import DataPoint from "../database/data_point";
import AbstractDevice from "../snmp/abstract";
export declare type TYPE = "comptair" | "alertairdc" | "paratonair" | "alertairts" | "unassigned";
export interface OnFrameCallback {
    (device: AbstractDevice | undefined): void;
}
export default class DeviceManagement {
    static instance: DeviceManagement;
    data_point_provider: DataPoint;
    constructor();
    stringToType(type: string): TYPE;
    onFrame(data: any): Promise<AbstractDevice | undefined>;
    list(): Promise<AbstractDevice[]>;
    isDisconnected(type: TYPE, frame: string): boolean;
    isAlert(type: TYPE, compressed_frame: string): boolean;
    _databaseDeviceToRealDevice(device: Device | undefined): AbstractDevice | undefined;
    setType(device: AbstractDevice, type?: TYPE): Promise<AbstractDevice | undefined>;
    getDeviceForContactair(contactair: string): Promise<AbstractDevice | undefined>;
    getDevice(internal: string, current_contactair?: string): Promise<AbstractDevice | undefined>;
    applyData: (data: any) => Promise<AbstractDevice | undefined>;
}
