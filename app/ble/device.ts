import { EventEmitter } from "events";
import DeviceModel, { Device } from "../push_web/device_model";
import Paratonair from "../snmp/paratonair";
import AlertairDC from "../snmp/alertairdc";
import Ellips from "../snmp/ellips";

import DataPoint, { DataPointModel } from "../database/data_point";
import AbstractDevice from "../snmp/abstract";
import Comptair from "../snmp/comptair";
import AlertairTS from "../snmp/alertairts";

const model_devices = DeviceModel.instance;
const TYPE_PARATONAIR = 3;
const TYPE_COMPTAIR = 1;
const TYPE_ALERTAIRDC = 2;
const TYPE_ALERTAIRTS = 4;

export interface OnFrameCallback {
    (device: AbstractDevice|undefined): void;
}

function stringTypeToInt(type: string) {
    if(type == "comptair") return 1;
    if(type == "alertairdc") return 2;
    if(type == "paratonair") return 3;
    if(type == "alertairts") return 4;
    return 0;
}

function intTypeToString(type: number) {
    switch(type) {
        case TYPE_COMPTAIR: return "comptair";
        case TYPE_ALERTAIRDC: return "alertairdc";
        case TYPE_ALERTAIRTS: return "alertairts";
        default: return "paratonair";
    }
}

export default class DeviceManagement {
    static instance: DeviceManagement = new DeviceManagement();

    data_point_provider: DataPoint;
    
    constructor() {
	    this.data_point_provider = new DataPoint();
    }

    /* UNUSED and no more available in data_point_provider
    getPoint(index: number) {
        return this.data_point_provider.getPoint(index);
    }
    */

    onFrame(data: any): Promise<AbstractDevice|undefined> {
        return new Promise((resolve, reject) => {
            if(data && data.sender) {
                this.applyData(data, (device: AbstractDevice|undefined) => resolve(device));
            } else {
                resolve(undefined);
            }
        });
    }

    list(): Promise<AbstractDevice[]> {
        return model_devices.list()
        .then(devices => devices ? devices : [])
        .then(devices => devices.map(device => this._databaseDeviceToRealDevice(device)))
        //.then(devices => devices.filter(device => undefined != device));
        .then(devices => {
            const array: AbstractDevice[] = [];
            devices.forEach(d => { if(undefined != d) array.push(d) });
            return array;
        });
    }

    _databaseDeviceToRealDevice(device: Device|undefined): AbstractDevice|undefined {
        if(device) {
            switch(device.type) {
                case TYPE_COMPTAIR:
                    return new Comptair({
                        no_snmp: true,
                        lpsfr: {
                            type: intTypeToString(TYPE_COMPTAIR),
                            serial: device.serial,
                            internal: device.internal_serial,
                            id: device.id
                        }
                    });
                case TYPE_ALERTAIRDC:
                    return new AlertairDC({
                        no_snmp: true,
                        lpsfr: {
                            type: intTypeToString(TYPE_ALERTAIRDC),
                            serial: device.serial,
                            internal: device.internal_serial,
                            id: device.id
                        }
                    });
                case TYPE_ALERTAIRTS:
                    return new AlertairTS({
                        no_snmp: true,
                        lpsfr: {
                            type: intTypeToString(TYPE_ALERTAIRTS),
                            serial: device.serial,
                            internal: device.internal_serial,
                            id: device.id
                        }
                    });
                case TYPE_PARATONAIR:
                default:
                    return new Paratonair({
                        no_snmp: true,
                        lpsfr: {
                            type: intTypeToString(TYPE_PARATONAIR),
                            serial: device.serial,
                            internal: device.internal_serial,
                            id: device.id
                        }
                    });
            }
        }

        console.log("unnown type !", device);
        return undefined;
    }

    setType(device: AbstractDevice, type?: string): Promise<AbstractDevice|undefined> {
        return device.getInternalSerial()
        .then(internal_serial => {
            console.log("setType " + internal_serial+" := " + type);
            return device.setType(type).then(() => internal_serial)
        })
        .then(internal_serial => {
            return model_devices.saveType(internal_serial, stringTypeToInt(type || "paratonair"))
            .then(() => this.getDevice(internal_serial))
        })
        .then(device => device)
        .catch(err => device);
    }

    getDevice(internal: string): Promise<AbstractDevice|undefined> {
        console.log("getDevice", internal);
        return model_devices.getDeviceForInternalSerial(internal)
        .then(device => {
            console.log("getDevice, first :=", device);
            if(device) return device;
            return model_devices.saveDevice({ serial: "", internal_serial: internal, type: TYPE_PARATONAIR });
        })
        .then(device => this._databaseDeviceToRealDevice(device));
    }

    applyData(data: any, device_callback: OnFrameCallback|undefined = undefined) {
        if(data && data.rawFrameStr) { //for now, using only lpsfr devices
            //rawFrameStr and rawDataStr are set
            if(data.rawFrameStr.length === 60) { //30*2
                const rawdata = data.rawDataStr;
                const internal = rawdata.substring(0, 6);

                const callback = () => {
                    this.getDevice(internal)
                    .then(device => {
                        var type: string = "";
                        var serial = "";
                        var config_internal = "";
                        if(device && device.getLPSFR()) {
                            const d: any = device.getLPSFR();
                            serial = d.serial;
                            type = d.type;
                            config_internal = d.internal;
                            if(config_internal) config_internal = config_internal.substring(0, 6);
                        }
                        if(!type) type = "";

                        var valid_device = false;
                        switch(type) {
                            case "paratonair":
                            case "comptair":
                            case "alertairdc":
                            case "alertairts":
                                valid_device = true;
                                break;
                            default:
                                valid_device = false;
                        }
    
                        if(rawdata.length > 6 && valid_device && internal === config_internal) {
                            console.log("having internal correct " + type);
                            this.data_point_provider.savePoint(serial, config_internal, data.sender, data.rawDataStr);
                        }

                        if(device_callback && device) {
                            device_callback(device);
                        }
                    })
                    .catch(err => {
                        console.log(err);
                    });
                };

                if(internal === "ffffff") {
                    console.log("having a ffffff serial, disconnected or impacted", data.sender);
                    this.data_point_provider.latestForContactair(data.sender)
                    .then(item => {
                        if(item) {
                            this.data_point_provider.savePoint(item.serial, item.internal, data.sender, data.rawDataStr);
                            console.log("saving to "+item.serial+" "+item.internal+" "+data.sender+" "+data.rawDataStr);
                        } else {
                            callback();
                        }
                    }).catch(err => {
                        console.log(err);
                        callback();
                    });
                } else {
                    callback();
                }
            } else if(data.rawFrameStr.length === 48) { //24*2
                /*this.agents.forEach(agent => {
                    const lpsfr = agent.getLPSFR();
                    if(lpsfr.internal === data.sender && lpsfr.type === "ellips") {
                        this.data_point_provider.savePoint(lpsfr.serial, lpsfr.internal, data.sender, data.rawDataStr);
                    }
                })*/
            }
        }
    }
}