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
const errors_1 = __importDefault(require("./errors"));
const frame_model_1 = __importDefault(require("./push_web/frame_model"));
const frame_model_compress_js_1 = __importDefault(require("./push_web/frame_model_compress.js"));
const device_js_1 = __importDefault(require("./ble/device.js"));
const device_model_js_1 = __importDefault(require("./push_web/device_model.js"));
const errors = errors_1.default.instance;
const VERSION = 8;
function serialize(promises) {
    return new Promise((resolve, reject) => {
        var index = 0;
        const callback = (index) => {
            if (index >= promises.length) {
                resolve(true);
            }
            else {
                const done = () => {
                    callback(index + 1);
                };
                (promises[index])().then(() => done()).catch(err => done());
            }
        };
        callback(index);
    });
}
class FrameManagerAlert extends events_1.EventEmitter {
    constructor() {
        super();
        this._started = false;
        this._current_index = 0;
        this.isProductButNeedAlertOrNot = (f) => f && f.product_id && (undefined == f.is_alert || null == f.is_alert);
        this.hasNotProduct = (f) => f && !f.product_id;
        this.hasProduct = (f) => f && !!f.product_id;
    }
    start() {
        if (this._started)
            return;
        this._started = true;
        setTimeout(() => this.checkNextTransactions(), 1);
    }
    deviceForContactair(devices, contactair) {
        return devices.find(d => d.last_contactair == contactair);
    }
    deviceForInternal(devices, internal_serial) {
        return devices.find(d => d.internal_serial == internal_serial);
    }
    tryUpdateDevicesForContactairs(devices, internal_serials) {
        devices.forEach(device => device && device.last_contactair == "ffffff" && (device.last_contactair = undefined));
        const to_update = internal_serials.filter(item => {
            if (item.internal_serial == "ffffff")
                return false;
            const device = this.deviceForInternal(devices, item.internal_serial);
            return device && device.last_contactair != item.contactair;
        });
        return Promise.all(to_update.map(({ contactair, internal_serial, id }) => device_model_js_1.default.instance.setContactairForDevice(contactair, internal_serial, id)))
            .then(() => device_model_js_1.default.instance.cleanContactair())
            .then(() => true);
    }
    setDevicesForInvalidProductsOrAlerts(devices, frames) {
        const internal_serials_for_update = frames.map(f => ({
            internal_serial: frame_model_1.default.instance.getInternalSerial(f.frame),
            contactair: frame_model_1.default.instance.getContactair(f.frame),
            frame: f.frame,
            id: f.id || 0,
            product_id: f.product_id || undefined
        }));
        const internal_serials = frames.filter(f => this.isProductButNeedAlertOrNot(f) || this.hasNotProduct(f)).map(f => ({
            internal_serial: frame_model_1.default.instance.getInternalSerial(f.frame),
            contactair: frame_model_1.default.instance.getContactair(f.frame),
            frame: f.frame,
            id: f.id || 0,
            product_id: f.product_id || undefined
        }));
        return this.tryUpdateDevicesForContactairs(devices, internal_serials_for_update).then(() => {
            if (internal_serials.length == 0) {
                return Promise.resolve(true);
            }
            const serials = [];
            const contactairs = [];
            const serial_to_contactair = new Map();
            const mapping_internal_serials = [];
            const mapping_contactairs = [];
            internal_serials.forEach(pre_holder => {
                const { id, internal_serial, frame, contactair } = pre_holder;
                if (internal_serial != "ffffff") {
                    //@ts-ignore
                    if (!mapping_internal_serials[internal_serial]) {
                        //@ts-ignore
                        mapping_internal_serials[internal_serial] = { contactair, internal_serial, data: [] };
                        serials.push(internal_serial);
                    }
                    //@ts-ignore
                    mapping_internal_serials[internal_serial].data.push({ id, frame });
                    //TODO when being in the past, don't check for modification from earlier... add this into the first loop? the one using latest elements
                    //or store into the device update ?
                    //updating the mapping internal_serial -> contactair to check for modification
                    if (!serial_to_contactair.has(internal_serial))
                        serial_to_contactair.set(internal_serial, contactair);
                }
                else {
                    //@ts-ignore
                    if (!mapping_contactairs[contactair]) {
                        //@ts-ignore
                        mapping_contactairs[contactair] = { contactair, internal_serial: "", data: [] };
                        contactairs.push(contactair);
                    }
                    //@ts-ignore
                    mapping_contactairs[contactair].data.push({ id, frame });
                }
            });
            return Promise.all(contactairs.map(contactair => {
                return device_js_1.default.instance.getDeviceForContactair(contactair)
                    .then(device => {
                    if (!device)
                        return Promise.resolve(false);
                    return device.getInternalSerial()
                        .then(internal_serial => {
                        if (internal_serial == "ffffff") {
                            return false;
                        }
                        ;
                        //@ts-ignore
                        const mapping_contactair = mapping_contactairs[contactair];
                        if (mapping_contactair) {
                            const id_frames = mapping_contactair.data;
                            //@ts-ignore
                            if (!mapping_internal_serials[internal_serial]) {
                                //@ts-ignore
                                mapping_internal_serials[internal_serial] = { contactair, internal_serial, data: [] };
                                serials.push(internal_serial);
                                //updating the mapping internal_serial -> contactair to check for modification
                                if (!serial_to_contactair.has(internal_serial))
                                    serial_to_contactair.set(internal_serial, contactair);
                            }
                            //@ts-ignore
                            id_frames.forEach(id_frame => mapping_internal_serials[internal_serial].data.push(id_frame));
                        }
                        return true;
                    })
                        .then(() => true);
                });
            }))
                .then(() => Promise.all(serials.map((serial) => device_js_1.default.instance.getDevice(serial, serial_to_contactair.get(serial))
                .then(device => ({ device, serial })))))
                .then(devices => devices.filter(d => d.device))
                .then(devices => {
                const promises = [];
                devices.forEach(tuple => {
                    const { device, serial } = tuple;
                    //@ts-ignore
                    const holder = mapping_internal_serials[serial];
                    device && holder.data.forEach((data, index) => {
                        const { id, frame } = data;
                        promises.push(() => device.getType().then(rawType => {
                            const compressed = frame_model_compress_js_1.default.instance.getFrameWithoutHeader(frame);
                            const type = device_js_1.default.instance.stringToType(rawType);
                            const is_alert = device_js_1.default.instance.isAlert(type, compressed);
                            const is_disconnected = device_js_1.default.instance.isDisconnected(type, compressed);
                            return frame_model_1.default.instance.setDevice(id, device.getId(), is_alert, is_disconnected);
                        }));
                    });
                });
                return serialize(promises);
            })
                .then(() => Promise.resolve(true));
        });
    }
    manageFrame(devices, from, until) {
        return __awaiter(this, void 0, void 0, function* () {
            const frames = (yield frame_model_1.default.instance.getFrame(from, until)) || [];
            if (frames.length == 0)
                return -1;
            var next = frames.reduce((t1, t2) => {
                if (!t1.id)
                    return t2;
                if (!t2.id)
                    return t1;
                return t1.id > t2.id ? t1 : t2;
            }, frames[0]);
            yield this.setDevicesForInvalidProductsOrAlerts(devices, frames);
            return (next.id || -1) + 1;
        });
    }
    wait(timeout) {
        return new Promise(resolve => setTimeout(() => resolve(true), timeout));
    }
    checkNextTransactions() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const devices = yield device_model_js_1.default.instance.list();
                const maximum = yield frame_model_1.default.instance.getMaxFrame();
                try {
                    if (maximum > 0)
                        yield this.manageFrame(devices, Math.max(1, maximum - 50), 50);
                }
                catch (e) {
                }
                const new_index = yield this.manageFrame(devices, this._current_index, 200);
                if (new_index == -1) {
                    this._current_index = -1;
                    yield this.wait(50000);
                }
                this._current_index = new_index;
                setTimeout(() => this.checkNextTransactions(), 500);
            }
            catch (err) {
                console.error("error", err);
                setTimeout(() => this.checkNextTransactions(), 5000);
            }
        });
    }
}
exports.default = FrameManagerAlert;
FrameManagerAlert.instance = new FrameManagerAlert();
//# sourceMappingURL=frame_manager_alert.js.map