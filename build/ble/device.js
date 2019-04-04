"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const device_model_1 = __importDefault(require("../push_web/device_model"));
const paratonair_1 = __importDefault(require("../snmp/paratonair"));
const data_point_1 = __importDefault(require("../database/data_point"));
const model_devices = device_model_1.default.instance;
const TYPE_PARATONAIR = 0;
class DeviceManagement {
    constructor() {
        this.data_point_provider = new data_point_1.default();
    }
    onFrame(data) {
        return new Promise((resolve, reject) => {
            if (data && data.sender) {
                this.applyData(data, (device) => resolve(device));
            }
            else {
                resolve(undefined);
            }
        });
    }
    list() {
        return model_devices.list()
            .then(devices => devices ? devices : [])
            .then(devices => devices.map(device => this._databaseDeviceToRealDevice(device)))
            .then(devices => {
            const array = [];
            devices.forEach(d => { if (undefined != d)
                array.push(d); });
            return array;
        });
    }
    _databaseDeviceToRealDevice(device) {
        if (device && device.type == TYPE_PARATONAIR) {
            return new paratonair_1.default({
                no_snmp: true,
                lpsfr: {
                    type: "paratonair",
                    serial: device.serial,
                    internal: device.internal_serial,
                    id: device.id
                }
            });
        }
        else {
            console.log("unnown type !", device);
            return undefined;
        }
    }
    getDevice(internal) {
        console.log("getDevice", internal);
        return model_devices.getDeviceForInternalSerial(internal)
            .then(device => {
            console.log("getDevice, first :=", device);
            if (device)
                return device;
            return model_devices.saveDevice({ serial: "", internal_serial: internal, type: TYPE_PARATONAIR });
        })
            .then(device => this._databaseDeviceToRealDevice(device));
    }
    applyData(data, device_callback = undefined) {
        if (data && data.rawFrameStr) {
            //rawFrameStr and rawDataStr are set
            if (data.rawFrameStr.length === 60) {
                const rawdata = data.rawDataStr;
                const internal = rawdata.substring(0, 6);
                const callback = () => {
                    this.getDevice(internal)
                        .then(device => {
                        var type = "";
                        var serial = "";
                        var config_internal = "";
                        if (device && device.getLPSFR()) {
                            const d = device.getLPSFR();
                            serial = d.serial;
                            type = d.type;
                            config_internal = d.internal;
                            if (config_internal)
                                config_internal = config_internal.substring(0, 6);
                        }
                        console.log("having device := ", device);
                        if (rawdata.length > 6 && (type === "paratonair" || type === "comptair")) {
                            if (internal === config_internal) {
                                console.log("having internal correct");
                                this.data_point_provider.savePoint(serial, config_internal, data.sender, data.rawDataStr);
                            }
                        }
                        if (device_callback && device) {
                            device_callback(device);
                        }
                    })
                        .catch(err => {
                        console.log(err);
                    });
                };
                if (internal === "ffffff") {
                    console.log("having a ffffff serial, disconnected or impacted", data.sender);
                    this.data_point_provider.latestForContactair(data.sender)
                        .then(item => {
                        if (item) {
                            this.data_point_provider.savePoint(item.serial, item.internal, data.sender, data.rawDataStr);
                            console.log("saving to " + item.serial + " " + item.internal + " " + data.sender + " " + data.rawDataStr);
                        }
                        else {
                            callback();
                        }
                    }).catch(err => {
                        console.log(err);
                        callback();
                    });
                }
                else {
                    callback();
                }
            }
            else if (data.rawFrameStr.length === 48) {
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
DeviceManagement.instance = new DeviceManagement();
exports.default = DeviceManagement;
//# sourceMappingURL=device.js.map