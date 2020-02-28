"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
var bleno = null;
var needRepair = false;
try {
    bleno = require("bleno");
}
catch (e) {
    console.log(e);
    bleno = null;
    log_1.Logger.error(e, "Erreur while importing ble");
    if (e && e.toString) {
        const message = e.toString();
        needRepair = message && message.indexOf("NODE_MODULE_VERSION 48. This version of Node.js requires NODE_MODULE_VERSION 51");
    }
}
try {
    if (!!bleno) {
        log_1.Logger.data({ ble: true });
    }
    else {
        log_1.Logger.data({ ble: false });
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
exports.startAdvertising = (id, uuids) => {
    if (bleno) {
        bleno.startAdvertising(id, uuids);
    }
    else {
        console.log("can't advertise for " + id, uuids);
    }
};
exports.stopAdvertising = () => {
    if (bleno) {
        bleno.stopAdvertising();
    }
    else {
        console.log("can't stop advertising");
    }
};
exports.setServices = (services, callback) => {
    if (bleno) {
        bleno.setServices(services, callback);
    }
    else {
        console.log("setServices failed, no bleno");
    }
};
exports.onBlenoEvent = (name, callback) => {
    if (bleno) {
        bleno.on(name, callback);
    }
    else {
        console.log("setServices failed, no bleno");
    }
};
exports.mtu = () => {
    if (bleno) {
        return bleno.mtu;
    }
    return 0;
};
const _PrimaryService = bleno ? bleno.PrimaryService : SafePrimaryService;
const _Characteristic = bleno ? bleno.Characteristic : SafeCharacteristics;
const _Descriptor = bleno ? bleno.Descriptor : null;
exports.PrimaryService = _PrimaryService;
exports.Characteristic = _Characteristic;
exports.Descriptor = _Descriptor;
exports.isBlenoAvailable = null != bleno;
exports.needBluetoothRepair = !!needRepair;
//# sourceMappingURL=safeBleno.js.map