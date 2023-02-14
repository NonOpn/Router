"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
//@ts-ignore
const v4_1 = __importDefault(require("uuid/v4"));
//@ts-ignore
const serialport_1 = __importDefault(require("serialport"));
//@ts-ignore
const node_enocean_1 = __importDefault(require("node-enocean"));
const enocean_1 = __importDefault(require("./config/enocean"));
const getByte = (telegram_byte_str, index) => telegram_byte_str[index * 2] + telegram_byte_str[index * 2 + 1];
const getEEP = (rorg, rorg_func, rorg_type) => (rorg + "-" + rorg_func + "-" + rorg_type).toLowerCase();
const isFrameToSend = (rorg) => ["a5", "f6", "d5", "d2", "d1"].filter(e => e === rorg).length > 0;
function isARecognizedKnownDevice(port) {
    if (port.manufacturer !== undefined) {
        return ["ftdi", "enocean"].find(element => port.manufacturer.toLowerCase().indexOf(element) >= 0);
    }
    return false;
}
function isARecognizedDevice(port) {
    if (isARecognizedKnownDevice(port)) {
        return true;
    }
    return ["/dev/ttyAMA0", "/dev/ttyS0"].find(s => s === port.path);
}
class EnoceanDevice extends events_1.EventEmitter {
    constructor(port) {
        super();
        this.enocean = node_enocean_1.default();
        this.open_device = undefined;
        this.isOpen = () => !!this.open_device;
        this.port = port;
    }
    init() {
        this.enocean.on("ready", () => {
            this.emit("usb-open", this.port);
        });
        this.enocean.on("data", (data) => {
            try {
                this.enocean.info(data.senderId, (sensor) => this.onLastValuesRetrieved(sensor, (sensor == undefined ? {} : undefined), data));
            }
            catch (e) {
                console.log(e);
            }
        });
        this.enocean.on("learned", (data) => {
            this.enocean.getSensors((sensors) => this.emit("new_learned_list", sensors));
        });
        this.enocean.on("unknown-teach-in", (data) => { });
        this.enocean.on("error", (err) => this.checkEventClose(this));
        this.enocean.on("disconnect", (e, ee) => this.checkEventClose(this));
        this.enocean.connect("mongodb://localhost/snmp_memory");
        this.enocean.register(this);
        this.enocean.emitters.push(this);
        this.on("get-usb-state", () => {
            if (this.open_device == undefined) {
                this.emit("usb-state", "off");
            }
            else {
                this.emit("usb-state", "on");
            }
        });
        this.openDevice(this.port);
    }
    checkEventClose(caller) {
        if (this.open_device != undefined) {
            this.emit("usb-closed", this.open_device);
            this.open_device = undefined;
        }
    }
    onLastValuesRetrieved(sensor_data, err, data) {
        try {
            var eep = undefined;
            if (sensor_data != undefined && sensor_data.eep != undefined) {
                eep = sensor_data.eep;
            }
            if ((eep != undefined) || data.rawByte.length >= (6 + 7)) { //at least 6 bytes for headers and 7 to have all data
                var rorg = undefined;
                if (eep == undefined) {
                    rorg = getByte(data.rawByte, 6);
                    var rorg_func = getByte(data.rawByte, 6 + 6);
                    var rorg_type = getByte(data.rawByte, 6 + 7);
                    eep = getEEP(rorg, rorg_func, rorg_type);
                }
                else {
                    rorg = eep.split("-")[0];
                }
                if (isFrameToSend(rorg)) {
                    //var rawFrame = new Buffer(data.rawByte, "hex");
                    //var rawData = new Buffer(data.raw, "hex");
                    var resolved = this.enocean.eepResolvers.find((func) => {
                        try {
                            var ret = func(eep, data.raw);
                            if (ret != undefined)
                                return ret;
                        }
                        catch (e) {
                            console.log(e);
                        }
                        return undefined;
                    });
                    var output = {
                        "date": new Date(),
                        "guid": v4_1.default(),
                        "sender": data.senderId,
                        "eep": eep
                    };
                    if (resolved != undefined) {
                        output.data = resolved;
                    }
                    output.rawDataStr = data.raw;
                    output.rawFrameStr = data.rawByte;
                    this.emit("managed_frame", output);
                }
            }
        }
        catch (e) {
            console.log(e);
        }
    }
    openDevice(port) {
        try {
            this.open_device = port;
            this.enocean.listen(port.comName);
        }
        catch (e) {
            console.log(e);
        }
    }
}
class EnoceanLoader extends events_1.EventEmitter {
    constructor() {
        super();
        this.devices = [];
        this.started = false;
    }
    openDevice(port) {
        const bindTo = new EnoceanDevice(port);
        bindTo.on("ready", (port) => this.emit("usb-open", port));
        bindTo.on("managed_frame", (output) => this.emit("managed_frame", output));
        bindTo.on("new_learned_list", (sensors) => this.emit("new_learned_list", sensors));
        bindTo.on("unknown-teach-in", (data) => { });
        bindTo.on("usb-closed", (device) => this.emit("usb-closed", device));
        this.devices.push(bindTo);
        bindTo.init();
    }
    removeDevice(device) {
        device.removeAllListeners("ready");
        device.removeAllListeners("managed_frame");
        device.removeAllListeners("new_learned_list");
        device.removeAllListeners("unknown-teach-in");
        device.removeAllListeners("usb-closed");
    }
    postNextRead() {
        setTimeout(() => this.readDevices(), 15000);
    }
    init() {
        if (!this.started) {
            this.started = true;
            this.readDevices();
        }
    }
    readDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.devices.find(device => device.isOpen()))
                    return;
                var devices = yield this.listOnlyKnownDevices();
                if (enocean_1.default.enocean_endpoint != null) {
                    if (!devices.find(d => d.comName == enocean_1.default.enocean_endpoint)) {
                        devices.push({ comName: enocean_1.default.enocean_endpoint });
                    }
                }
                else {
                    devices = yield this.listDevices();
                }
                console.log("valid devices", devices);
                devices.forEach(device => this.openDevice(device));
            }
            catch (err) {
            }
            this.postNextRead();
        });
    }
    listAllDevice() {
        return new Promise((resolve, reject) => {
            const callback = (err, ports) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!ports)
                    ports = [];
                console.log("list of found devices", ports);
                resolve(ports);
            };
            const fallback = () => {
                const list = serialport_1.default.list();
                list.then(ports => callback(null, ports))
                    .catch(err => reject(err));
            };
            try {
                const result = serialport_1.default.list(callback);
                if (result && result.then) {
                    result.then(fallback).catch(fallback);
                }
            }
            catch (e) {
                fallback();
            }
        });
    }
    listDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            const devices = yield this.listAllDevice();
            return devices.filter(port => isARecognizedDevice(port));
        });
    }
    listOnlyKnownDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            const devices = yield this.listAllDevice();
            return devices.filter(port => isARecognizedKnownDevice(port));
        });
    }
    systemDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            const devices = yield this.listAllDevice();
            return devices.filter(port => ({ manufacturer: port.manifacturer, path: port.serial }));
        });
    }
}
exports.default = EnoceanLoader;
//# sourceMappingURL=enocean.js.map