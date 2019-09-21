"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bleno = null;
try {
    bleno = require("bleno");
}
catch (e) {
    console.log(e);
    bleno = null;
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
const _PrimaryService = bleno ? bleno.PrimaryService : SafePrimaryService;
const _Characteristic = bleno ? bleno.Characteristic : SafeCharacteristics;
const _Descriptor = bleno ? bleno.Descriptor : null;
exports.PrimaryService = _PrimaryService;
exports.Characteristic = _Characteristic;
exports.Descriptor = _Descriptor;
exports.isBlenoAvailable = null != bleno;
//# sourceMappingURL=safeBleno.js.map