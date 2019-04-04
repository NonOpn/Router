import { Device } from "../push_web/device_model";
import DataPoint from "../database/data_point";
import AbstractDevice from "../snmp/abstract";
export interface OnFrameCallback {
    (device: AbstractDevice | undefined): void;
}
export default class DeviceManagement {
    static instance: DeviceManagement;
    data_point_provider: DataPoint;
    constructor();
    getPoint(index: number): any;
    onFrame(data: any): Promise<AbstractDevice | undefined>;
    list(): Promise<AbstractDevice[]>;
    _databaseDeviceToRealDevice(device: Device | undefined): AbstractDevice | undefined;
    getDevice(internal: string): Promise<AbstractDevice | undefined>;
    applyData(data: any, device_callback?: OnFrameCallback | undefined): void;
}
