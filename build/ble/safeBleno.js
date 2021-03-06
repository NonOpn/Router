"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.needBluetoothRepair = exports.isBlenoAvailable = exports.Descriptor = exports.Characteristic = exports.PrimaryService = exports.mtu = exports.onBlenoEvent = exports.setServices = exports.stopAdvertising = exports.startAdvertising = exports.SafeCharacteristics = exports.SafePrimaryService = exports.logBLE = void 0;
const log_1 = require("../log");
const network_1 = __importDefault(require("../network"));
function log(data) {
    if (!network_1.default.instance.isGPRS()) {
        log_1.Logger.data(Object.assign({ context: "ble" }, data));
    }
}
var bleno = null;
var needRepair = false;
try {
    bleno = require("bleno");
}
catch (e) {
    console.log(e);
    bleno = null;
    !network_1.default.instance.isGPRS() && log_1.Logger.error(e, "Erreur while importing ble");
    log({ bleno: "error" });
    if (e && e.toString) {
        const message = e.toString();
        needRepair = message && message.indexOf("NODE_MODULE_VERSION 48. This version of Node.js requires NODE_MODULE_VERSION 51");
    }
}
exports.logBLE = log;
try {
    if (!bleno) {
        needRepair = true;
    }
}
catch (e) {
}
class SafePrimaryService {
}
exports.SafePrimaryService = SafePrimaryService;
class SafeCharacteristics {
    constructor(json) {
        console.log("fake", json);
    }
    onReadRequest(offset, cb) {
        console.log("onReadRequest");
    }
}
exports.SafeCharacteristics = SafeCharacteristics;
const startAdvertising = (id, uuids) => {
    if (bleno) {
        bleno.startAdvertising(id, uuids);
    }
    else {
        console.log("can't advertise for " + id, uuids);
    }
};
exports.startAdvertising = startAdvertising;
const stopAdvertising = () => {
    if (bleno) {
        bleno.stopAdvertising();
    }
    else {
        console.log("can't stop advertising");
    }
};
exports.stopAdvertising = stopAdvertising;
const setServices = (services, callback) => {
    if (bleno) {
        bleno.setServices(services, callback);
        exports.logBLE({ services: services.length });
    }
    else {
        console.log("setServices failed, no bleno");
    }
};
exports.setServices = setServices;
const onBlenoEvent = (name, callback) => {
    if (bleno) {
        bleno.on(name, callback);
    }
    else {
        console.log("setServices failed, no bleno");
    }
};
exports.onBlenoEvent = onBlenoEvent;
const mtu = () => {
    if (bleno) {
        return bleno.mtu;
    }
    return 0;
};
exports.mtu = mtu;
const _PrimaryService = bleno ? bleno.PrimaryService : SafePrimaryService;
const _Characteristic = bleno ? bleno.Characteristic : SafeCharacteristics;
const _Descriptor = bleno ? bleno.Descriptor : null;
exports.PrimaryService = _PrimaryService;
exports.Characteristic = _Characteristic;
exports.Descriptor = _Descriptor;
exports.isBlenoAvailable = null != bleno;
exports.needBluetoothRepair = !!needRepair;
//# sourceMappingURL=safeBleno.js.map