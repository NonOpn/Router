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
import FrameModel from "../push_web/frame_model";

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
        return data && data.sender ? this.applyData(data) : Promise.resolve(undefined);
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

    isDisconnected(type: TYPE, frame: string): boolean {
        if(!frame) return false;
        switch(stringTypeToInt(type)) {
            case TYPE_PARATONAIR:
                return !Paratonair.isConnected(frame);
            case TYPE_ALERTAIRDC:
                return !AlertairDC.isConnected(frame);
            case TYPE_ALERTAIRTS:
                return !AlertairTS.isConnected(frame);
            case TYPE_COMPTAIR:
                return !Comptair.isConnected(frame);
            default:
                //add default detection
                return !Paratonair.isConnected(frame);
        }
    }

    isAlert(type: TYPE, compressed_frame: string): boolean {
        if(!compressed_frame) return false;
        switch(stringTypeToInt(type)) {
            case TYPE_PARATONAIR:
                return Paratonair.isStriken(compressed_frame);
            case TYPE_ALERTAIRDC:
                return AlertairDC.isCircuitDisconnect(compressed_frame);
            case TYPE_ALERTAIRTS:
                return AlertairTS.isAlert(compressed_frame);
            case TYPE_COMPTAIR:
                return Comptair.isStriken(compressed_frame);
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

        return undefined;
    }

    //previous implementation checked out only
    async setType(device: AbstractDevice, type?: TYPE): Promise<AbstractDevice|undefined> {
        try {
            const serial = await device.getInternalSerial();

            const previous_type = await device.getType();
            console.log("device :: setType " + previous_type+" "+type);
    
            if(previous_type != type) {
                await Promise.all([
                    FrameModelCompress.instance.invalidateAlerts(device.getId()),
                    FrameModel.instance.invalidateAlerts(device.getId())
                ])
            }
            await device.setType(type);
            await model_devices.saveType(serial, stringTypeToInt(type || "paratonair"));
            return this.getDevice(serial);
        } catch(err) {
            console.log("setType, having exception", err);
        }
        return device;
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
                //TODO add getDevice parameters to update with frame id BUT right now not necessary
                /*if(current_contactair && current_contactair != device.last_contactair && current_contactair != "ffffff") {
                    console.log("updating contactair !");
                    return model_devices.setContactairForDevice(current_contactair, device.internal_serial);
                }*/
                return Promise.resolve(device);
            }
            return model_devices.saveDevice({ serial: "", internal_serial: internal, last_contactair: current_contactair, type: TYPE_UNASSIGNED });
        })
        .then(device => this._databaseDeviceToRealDevice(device));
    }

    applyData = async (data: any): Promise<AbstractDevice|undefined> => {
        const _data = data ? data : {};
        const rawdata = _data.rawByte || _data.rawFrameStr;

        if(!rawdata) {
            return undefined;;
        }

        if(rawdata.length === 60) { //30*2
            const internal = FrameModel.instance.getInternalSerial(rawdata);
            const contactair = FrameModel.instance.getContactair(rawdata);

            try {
                var device = await this.getDevice(internal);
                if(device) return device;
                device = await this.getDeviceForContactair(contactair);

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
                    this.data_point_provider.savePoint(serial, config_internal, data.sender, rawdata);
                }

                return device;
            } catch(e) {
                return undefined;
            }
        } else if(rawdata.length === 48) { //24*2
            /*this.agents.forEach(agent => {
                const lpsfr = agent.getLPSFR();
                if(lpsfr.internal === data.sender && lpsfr.type === "ellips") {
                    this.data_point_provider.savePoint(lpsfr.serial, lpsfr.internal, data.sender, data.rawDataStr);
                }
            })*/
        }
        return undefined;
    }
}