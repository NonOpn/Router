"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const device_model_1 = __importDefault(require("../push_web/device_model"));
const paratonair_1 = __importDefault(require("../snmp/paratonair"));
const alertairdc_1 = __importDefault(require("../snmp/alertairdc"));
const data_point_1 = __importDefault(require("../database/data_point"));
const comptair_1 = __importDefault(require("../snmp/comptair"));
const alertairts_1 = __importDefault(require("../snmp/alertairts"));
const model_devices = device_model_1.default.instance;
const TYPE_PARATONAIR = 3;
const TYPE_COMPTAIR = 1;
const TYPE_ALERTAIRDC = 2;
const TYPE_ALERTAIRTS = 4;
function stringTypeToInt(type) {
    if (type == "comptair")
        return 1;
    if (type == "alertairdc")
        return 2;
    if (type == "paratonair")
        return 3;
    if (type == "alertairts")
        return 4;
    return 0;
}
function intTypeToString(type) {
    switch (type) {
        case TYPE_COMPTAIR: return "comptair";
        case TYPE_ALERTAIRDC: return "alertairdc";
        case TYPE_ALERTAIRTS: return "alertairts";
        default: return "paratonair";
    }
}
class DeviceManagement {
    constructor() {
        this.data_point_provider = new data_point_1.default();
    }
    /* UNUSED and no more available in data_point_provider
    getPoint(index: number) {
        return this.data_point_provider.getPoint(index);
    }
    */
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
            //.then(devices => devices.filter(device => undefined != device));
            .then(devices => {
            const array = [];
            devices.forEach(d => { if (undefined != d)
                array.push(d); });
            return array;
        });
    }
    _databaseDeviceToRealDevice(device) {
        if (device) {
            switch (device.type) {
                case TYPE_COMPTAIR:
                    return new comptair_1.default({
                        no_snmp: true,
                        lpsfr: {
                            type: intTypeToString(TYPE_COMPTAIR),
                            serial: device.serial,
                            internal: device.internal_serial,
                            id: device.id
                        }
                    });
                case TYPE_ALERTAIRDC:
                    return new alertairdc_1.default({
                        no_snmp: true,
                        lpsfr: {
                            type: intTypeToString(TYPE_ALERTAIRDC),
                            serial: device.serial,
                            internal: device.internal_serial,
                            id: device.id
                        }
                    });
                case TYPE_ALERTAIRTS:
                    return new alertairts_1.default({
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
                    return new paratonair_1.default({
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
    setType(device, type) {
        return device.getInternalSerial()
            .then(internal_serial => {
            console.log("setType " + internal_serial + " := " + type);
            return device.setType(type).then(() => internal_serial);
        })
            .then(internal_serial => {
            return model_devices.saveType(internal_serial, stringTypeToInt(type || "paratonair"))
                .then(() => this.getDevice(internal_serial));
        })
            .then(device => device)
            .catch(err => device);
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
        if (data && data.rawFrameStr) { //for now, using only lpsfr devices
            //rawFrameStr and rawDataStr are set
            if (data.rawFrameStr.length === 60) { //30*2
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
                        if (!type)
                            type = "";
                        console.log("having device := ", device);
                        var valid_device = false;
                        switch (type) {
                            case "paratonair":
                            case "comptair":
                            case "alertairdc":
                            case "alertairts":
                                valid_device = true;
                                break;
                            default:
                                valid_device = false;
                        }
                        if (rawdata.length > 6 && valid_device && internal === config_internal) {
                            console.log("having internal correct " + type);
                            this.data_point_provider.savePoint(serial, config_internal, data.sender, data.rawDataStr);
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
            else if (data.rawFrameStr.length === 48) { //24*2
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