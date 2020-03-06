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
const frame_model_compress_1 = __importDefault(require("../push_web/frame_model_compress"));
const frame_model_1 = __importDefault(require("../push_web/frame_model"));
const model_devices = device_model_1.default.instance;
const TYPE_UNASSIGNED = 0;
const TYPE_PARATONAIR = 3;
const TYPE_COMPTAIR = 1;
const TYPE_ALERTAIRDC = 2;
const TYPE_ALERTAIRTS = 4;
const VALID_TYPES = ["comptair", "alertairdc", "paratonair", "alertairts", "unassigned"];
function stringTypeToInt(type) {
    if (type == "comptair")
        return TYPE_COMPTAIR;
    if (type == "alertairdc")
        return TYPE_ALERTAIRDC;
    if (type == "paratonair")
        return TYPE_PARATONAIR;
    if (type == "alertairts")
        return TYPE_ALERTAIRTS;
    return TYPE_UNASSIGNED;
}
function intTypeToString(type) {
    switch (type) {
        case TYPE_COMPTAIR: return "comptair";
        case TYPE_ALERTAIRDC: return "alertairdc";
        case TYPE_ALERTAIRTS: return "alertairts";
        case TYPE_PARATONAIR: return "paratonair";
        default: return "unassigned";
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
    stringToType(type) {
        return VALID_TYPES.find(t => type == t) || "unassigned";
    }
    onFrame(data) {
        return data && data.sender ? this.applyData(data) : Promise.resolve(undefined);
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
    isDisconnected(type, frame) {
        if (!frame)
            return false;
        switch (stringTypeToInt(type)) {
            case TYPE_PARATONAIR:
                return !paratonair_1.default.isConnected(frame);
            case TYPE_ALERTAIRDC:
                return !alertairdc_1.default.isConnected(frame);
            case TYPE_ALERTAIRTS:
                return !alertairts_1.default.isConnected(frame);
            case TYPE_COMPTAIR:
                return !comptair_1.default.isConnected(frame);
            default:
                //add default detection
                return !paratonair_1.default.isConnected(frame);
        }
    }
    isAlert(type, compressed_frame) {
        if (!compressed_frame)
            return false;
        switch (stringTypeToInt(type)) {
            case TYPE_PARATONAIR:
                return paratonair_1.default.isStriken(compressed_frame);
            case TYPE_ALERTAIRDC:
                return alertairdc_1.default.isCircuitDisconnect(compressed_frame);
            case TYPE_ALERTAIRTS:
                return alertairts_1.default.isAlert(compressed_frame);
            case TYPE_COMPTAIR:
                return comptair_1.default.isStriken(compressed_frame);
            default:
                return false;
        }
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
        return undefined;
    }
    //previous implementation checked out only
    setType(device, type) {
        return device.getInternalSerial()
            .then(serial => {
            return device.getType()
                .then(previous_type => {
                if (previous_type != type) {
                    return Promise.all([
                        frame_model_compress_1.default.instance.invalidateAlerts(device.getId()),
                        frame_model_1.default.instance.invalidateAlerts(device.getId())
                    ])
                        .then(() => device.setType(type).then(() => serial));
                }
                return device.setType(type).then(() => serial);
            })
                .then(() => {
                return model_devices.saveType(serial, stringTypeToInt(type || "paratonair"))
                    .then(() => this.getDevice(serial));
            });
        })
            .then(device => device)
            .catch(err => device);
    }
    getDeviceForContactair(contactair) {
        return model_devices.getDeviceForContactair(contactair)
            .then(device => {
            if (device)
                return this._databaseDeviceToRealDevice(device);
            return undefined;
        });
    }
    getDevice(internal, current_contactair) {
        if (internal == "ffffff")
            return Promise.resolve(undefined);
        return model_devices.getDeviceForInternalSerial(internal)
            .then(device => {
            if (device) {
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
    applyData(data) {
        return new Promise((resolve, reject) => {
            const _data = data ? data : {};
            const rawdata = _data.rawByte || _data.rawFrameStr;
            if (!rawdata) {
                resolve(undefined);
                return;
            }
            if (rawdata.length === 60) { //30*2
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
                            this.data_point_provider.savePoint(serial, config_internal, data.sender, rawdata);
                        }
                        resolve(device);
                    })
                        .catch(err => {
                        console.log(err);
                        reject(err);
                    });
                };
                if (internal === "ffffff") {
                    this.data_point_provider.latestForContactair(data.sender)
                        .then(item => {
                        if (item) {
                            this.data_point_provider.savePoint(item.serial, item.internal, data.sender, rawdata);
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
            else if (rawdata.length === 48) { //24*2
                /*this.agents.forEach(agent => {
                    const lpsfr = agent.getLPSFR();
                    if(lpsfr.internal === data.sender && lpsfr.type === "ellips") {
                        this.data_point_provider.savePoint(lpsfr.serial, lpsfr.internal, data.sender, data.rawDataStr);
                    }
                })*/
                resolve(undefined);
            }
        });
    }
}
DeviceManagement.instance = new DeviceManagement();
exports.default = DeviceManagement;
//# sourceMappingURL=device.js.map