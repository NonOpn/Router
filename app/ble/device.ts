import { EventEmitter } from "events";
import DeviceModel, { Device } from "../push_web/device_model";
import Paratonair from "../snmp/paratonair";
import AlertairDC from "../snmp/alertairdc";
import Ellips from "../snmp/ellips";

import DataPoint, { DataPointModel } from "../database/data_point";
import AbstractDevice from "../snmp/abstract";
import Comptair from "../snmp/comptair";
import AlertairTS from "../snmp/alertairts";
import FrameModelCompress from "../push_web/frame_model_compress";

const model_devices = DeviceModel.instance;
const TYPE_UNASSIGNED = 0;
const TYPE_PARATONAIR = 3;
const TYPE_COMPTAIR = 1;
const TYPE_ALERTAIRDC = 2;
const TYPE_ALERTAIRTS = 4;

export type TYPE = "comptair"|"alertairdc"|"paratonair"|"alertairts"|"unassigned"
const VALID_TYPES: TYPE[] = ["comptair", "alertairdc", "paratonair", "alertairts", "unassigned"];

export interface OnFrameCallback {
    (device: AbstractDevice|undefined): void;
}

function stringTypeToInt(type: TYPE): number {
    if(type == "comptair") return TYPE_COMPTAIR;
    if(type == "alertairdc") return TYPE_ALERTAIRDC;
    if(type == "paratonair") return TYPE_PARATONAIR;
    if(type == "alertairts") return TYPE_ALERTAIRTS;
    return TYPE_UNASSIGNED;
}

function intTypeToString(type: number): TYPE {
    switch(type) {
        case TYPE_COMPTAIR: return "comptair";
        case TYPE_ALERTAIRDC: return "alertairdc";
        case TYPE_ALERTAIRTS: return "alertairts";
        case TYPE_PARATONAIR: return "paratonair";
        default: return "unassigned";
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

    stringToType(type: string): TYPE {
        return VALID_TYPES.find(t => type == t) || "unassigned";
    }
 
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

    isAlert(type: TYPE, frame: string): boolean {
        if(!frame) return false;
        switch(stringTypeToInt(type)) {
            case TYPE_PARATONAIR:
                return Paratonair.isStriken(frame) || !Paratonair.isConnected(frame);
            case TYPE_ALERTAIRDC:
                return AlertairDC.isCircuitDisconnect(frame) || !AlertairDC.isConnected(frame);
            case TYPE_ALERTAIRTS:
                return AlertairTS.isAlert(frame) || !AlertairTS.isConnected(frame);
            case TYPE_COMPTAIR:
                return Comptair.isStriken(frame) || !Comptair.isConnected(frame);
            default:
                return false;
        }
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

    setType(device: AbstractDevice, type?: TYPE): Promise<AbstractDevice|undefined> {
        console.log("setType", {product_id: device.getId(), type});
        return device.getInternalSerial()
        .then(serial => {
            return device.getType()
            .then(previous_type => {
                console.log("setType > update ? ", {previous_type, type});
                if(previous_type != type) {
                    console.log("setType > update ? update to do");
                    return FrameModelCompress.instance.invalidateAlerts(device.getId())
                    .then(() => device.setType(type).then(() => serial))
                }
                console.log("setType > update ? no update to do");
                return device.setType(type).then(() => serial)
            })
            .then(serial => {
                return model_devices.saveType(serial, stringTypeToInt(type || "paratonair"))
                .then(() => this.getDevice(serial))
            });
        })
        .then(device => device)
        .catch(err => device);
    }

    getDeviceForContactair(contactair: string): Promise<AbstractDevice|undefined> {
        return model_devices.getDeviceForContactair(contactair)
        .then(device => {
            if(device) return this._databaseDeviceToRealDevice(device);
            return undefined;
        });
    }

    getDevice(internal: string, current_contactair?: string): Promise<AbstractDevice|undefined> {
        if(internal == "ffffff") return Promise.resolve(undefined);
        return model_devices.getDeviceForInternalSerial(internal)
        .then(device => {
            if(device) {
                if(current_contactair && current_contactair != device.last_contactair && current_contactair != "ffffff") {
                    console.log("updating contactair !");
                    return model_devices.setContactairForDevice(current_contactair, device.internal_serial);
                }
                return Promise.resolve(device);
            }
            return model_devices.saveDevice({ serial: "", internal_serial: internal, last_contactair: current_contactair, type: TYPE_UNASSIGNED });
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