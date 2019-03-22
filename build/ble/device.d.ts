import { Device } from "../push_web/device_model";
import DataPoint from "../database/data_point";
import AbstractDevice from "../snmp/abstract";
export default class DeviceManagement {
    static instance: DeviceManagement;
    data_point_provider: DataPoint;
    constructor();
    onFrame(data: any): void;
    list(): Promise<AbstractDevice[]>;
    _databaseDeviceToRealDevice(device: Device | undefined): AbstractDevice | undefined;
    getDevice(internal: string): Promise<AbstractDevice | undefined>;
    applyData(data: any): void;
}