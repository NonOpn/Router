"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const errors_1 = __importDefault(require("./errors"));
const frame_model_1 = __importDefault(require("./push_web/frame_model"));
const device_js_1 = __importDefault(require("./ble/device.js"));
const errors = errors_1.default.instance;
const VERSION = 8;
class FrameManagerAlert extends events_1.EventEmitter {
    constructor() {
        super();
        this._started = false;
        this._current_index = 0;
    }
    start() {
        if (this._started)
            return;
        this._started = true;
        setTimeout(() => this.checkNextTransactions(), 1);
    }
    setDevicesForInvalidProductsOrAlerts(frames) {
        const isProductButNeedAlertOrNot = (f) => f && f.product_id && (undefined == f.is_alert || null == f.is_alert);
        const hasNotProduct = (f) => f && !f.product_id;
        return new Promise((resolve, reject) => {
            const internal_serials = frames.filter(f => isProductButNeedAlertOrNot(f) || hasNotProduct(f)).map(f => ({
                internal_serial: frame_model_1.default.instance.getInternalSerial(f.frame),
                frame: f.frame,
                id: f.id || 0
            }));
            if (internal_serials.length == 0) {
                console.log("this batch has no device to update", frames);
                resolve(true);
                return;
            }
            const serials = [];
            const mapping = [];
            internal_serials.forEach(pre_holder => {
                const { id, internal_serial, frame } = pre_holder;
                if (!mapping[internal_serial]) {
                    mapping[internal_serial] = { internal_serial, data: [] };
                    serials.push(internal_serial);
                }
                mapping[internal_serial].data.push({ id, frame });
            });
            Promise.all(serials.map(serial => device_js_1.default.instance.getDevice(serial).then(device => ({ device, serial }))))
                .then(devices => devices.filter(d => d.device))
                .then(devices => {
                console.log("having devices " + devices.filter(d => d.device).length);
                const promises = [];
                devices.forEach(tuple => {
                    const { device, serial } = tuple;
                    const holder = mapping[serial];
                    device && holder.data.forEach((data, index) => {
                        const { id, frame } = data;
                        promises.push(device.getType().then(rawType => {
                            const type = device_js_1.default.instance.stringToType(rawType);
                            const is_alert = device_js_1.default.instance.isAlert(type, frame);
                            return frame_model_1.default.instance.setDevice(id, device.getId(), is_alert);
                        }));
                    });
                });
                return Promise.all(promises);
            })
                .then(() => {
                console.log("batch done to set device information");
                resolve(true);
            })
                .catch(err => reject(err));
        });
    }
    manageFrame(from, until) {
        return frame_model_1.default.instance.getFrame(from, until)
            .then(frames => {
            frames = frames || [];
            if (frames.length == 0)
                return Promise.resolve(-1);
            var next = frames.reduce((t1, t2) => {
                if (!t1.id)
                    return t2;
                if (!t2.id)
                    return t1;
                return t1.id > t2.id ? t1 : t2;
            }, frames[0]);
            return this.setDevicesForInvalidProductsOrAlerts(frames)
                .then(() => (next.id || -1) + 1);
        });
    }
    checkNextTransactions() {
        frame_model_1.default.instance.getMaxFrame()
            .then(maximum => {
            if (maximum > 0)
                return this.manageFrame(Math.max(1, maximum - 50), 50).then(() => true).catch(() => true);
            return Promise.resolve(true);
        })
            .then(() => this.manageFrame(this._current_index, 200))
            .then(new_index => {
            if (new_index == -1) {
                console.log("no frame to manage at all... we reset the loop...");
                this._current_index = -1;
                return new Promise(resolve => setTimeout(() => resolve(true), 5000));
            }
            this._current_index = new_index;
            console.log("new_index is now _current_index:=" + this._current_index);
            return true;
        })
            .then(done => {
            console.log("batch ?", done);
            setTimeout(() => this.checkNextTransactions(), 200);
        })
            .catch(err => {
            console.error("error", err);
            setTimeout(() => this.checkNextTransactions(), 5000);
        });
    }
}
FrameManagerAlert.instance = new FrameManagerAlert();
exports.default = FrameManagerAlert;
//# sourceMappingURL=frame_manager_alert.js.map