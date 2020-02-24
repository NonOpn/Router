"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const v4_1 = __importDefault(require("uuid/v4"));
const serialport_1 = __importDefault(require("serialport"));
const node_enocean_1 = __importDefault(require("node-enocean"));
const enocean_1 = __importDefault(require("./config/enocean"));
const enocean_send_1 = __importDefault(require("./enocean_send"));
const log_1 = require("./log");
const enocean = node_enocean_1.default();
const enocean_send = new enocean_send_1.default();
function getByte(telegram_byte_str, index) {
    return telegram_byte_str[index * 2] + telegram_byte_str[index * 2 + 1];
}
function getEEP(rorg, rorg_func, rorg_type) {
    return (rorg + "-" + rorg_func + "-" + rorg_type).toLowerCase();
}
function mergeJson(output, input) {
    for (var key in input) {
        output[key] = input[key];
    }
}
function isFrameToSend(rorg) {
    return ["a5", "f6", "d5", "d2", "d1"].filter(function (e) {
        return e === rorg;
    }).length > 0;
}
function getDevicesKnown(callback) {
    enocean.getSensors((sensors) => {
        callback(sensors);
    });
}
function isARecognizedDevice(port) {
    if (port.manufacturer !== undefined) {
        var found = ["ftdi", "enocean"].filter(function (element) {
            return port.manufacturer.toLowerCase().indexOf(element) >= 0;
        });
        return found.length > 0;
    }
    return false;
}
class EnoceanLoader extends events_1.EventEmitter {
    constructor() {
        super();
        this.open_device = undefined;
        enocean.on("ready", () => {
            this.emit("usb-open", this.port);
            console.log("-");
        });
        enocean.on("data", (data) => {
            try {
                enocean.info(data.senderId, (sensor) => this.onLastValuesRetrieved(sensor, (sensor == undefined ? {} : undefined), data));
            }
            catch (e) {
                console.log(e);
            }
        });
        enocean.on("learned", (data) => {
            enocean.getSensors((sensors) => {
                this.emit("new_learned_list", sensors);
            });
        });
        enocean.on("unknown-teach-in", (data) => {
            console.log("found a frame of teach in", data);
        });
        enocean.on("error", (err) => {
            this.checkEventClose(this);
        });
        enocean.on("disconnect", (e, ee) => {
            this.checkEventClose(this);
        });
        enocean.connect("mongodb://localhost/snmp_memory");
        setInterval(() => {
            this.readDevices();
        }, 2000);
        this.register(this);
    }
    register(listener) {
        enocean.register(this);
        enocean.emitters.push(this);
        this.on("get-usb-state", () => {
            if (this.open_device == undefined) {
                this.emit("usb-state", "off");
            }
            else {
                this.emit("usb-state", "on");
            }
        });
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
                    var resolved = enocean.eepResolvers.find((func) => {
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
                    console.log(output);
                    //log the input enocean for the given device
                    log_1.Logger.identity(output);
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
            enocean.listen(port.comName);
        }
        catch (e) {
        }
    }
    readDevices() {
        if (this.open_device === undefined) {
            if (enocean_1.default.enocean_endpoint != null) {
                this.openDevice({ comName: enocean_1.default.enocean_endpoint });
            }
            else {
                serialport_1.default.list((err, ports) => {
                    ports.forEach((port) => {
                        if (isARecognizedDevice(port)) {
                            this.openDevice(port);
                        }
                    });
                });
            }
        }
    }
}
exports.default = EnoceanLoader;
//# sourceMappingURL=enocean.js.map