"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BLESyncCharacteristic_1 = require("./ble/BLESyncCharacteristic");
const config_1 = __importDefault(require("./config/config"));
const device_model_1 = __importDefault(require("./push_web/device_model"));
const frame_model_compress_1 = __importDefault(require("./push_web/frame_model_compress"));
const visualisation_1 = __importDefault(require("./config/visualisation"));
const wifi_js_1 = __importDefault(require("./wifi/wifi.js"));
const device_1 = __importDefault(require("./ble/device"));
const network_1 = __importDefault(require("./network"));
const system_1 = __importDefault(require("./system"));
const safeBleno_1 = require("./ble/safeBleno");
const device_management = device_1.default.instance;
const wifi = wifi_js_1.default.instance;
const network = network_1.default.instance;
const diskspace = system_1.default.instance;
const devices = device_model_1.default.instance;
const BLEConstants_1 = require("./ble/BLEConstants");
const frame_model_1 = __importDefault(require("./push_web/frame_model"));
var id = "Routair";
if (config_1.default.identity && config_1.default.identity.length >= 5 * 2) { //0xAABBCCDD
    id += config_1.default.identity.substr(0, 5 * 2);
}
var seenDevices = {
    devices: [],
    count: 0
};
class BLEDescriptionCharacteristic extends safeBleno_1.Characteristic {
    constructor(uuid, value) {
        super({
            uuid: uuid,
            properties: ['read'],
            value: Buffer.from(value, 'utf-8')
        });
        this._value = Buffer.from(value, "utf-8");
    }
    onReadRequest(offset, cb) { cb(BLEConstants_1.RESULT_SUCCESS, this._value); }
}
class BLEAsyncDescriptionCharacteristic extends safeBleno_1.Characteristic {
    constructor(uuid, callback) {
        super({
            uuid: uuid,
            properties: ['read']
        });
        this._last_offset = 0;
        this._callback = callback;
    }
    readOrSend(offset) {
        if (offset > 0 && this._last_offset <= offset) {
            return new Promise((resolve) => {
                this._last_offset = offset;
                resolve(this._obtained);
            });
        }
        return this._callback()
            .then(value => {
            this._obtained = Buffer.from(value, "utf-8");
            this._last_offset = offset;
            return this._obtained;
        });
    }
    onReadRequest(offset, cb) {
        this.readOrSend(offset)
            .then(buffer => {
            const current_mtu = Math.max(0, safeBleno_1.mtu() - 4);
            if (current_mtu >= buffer.byteLength - offset) {
                //console.log("ended !");
            }
            cb(BLEConstants_1.RESULT_SUCCESS, buffer.slice(offset));
        });
    }
}
class BLEFrameNotify extends safeBleno_1.Characteristic {
    constructor(uuid, value) {
        super({
            uuid: uuid,
            properties: ['notify']
        });
        this._updateFramesCallback = null;
        this._value = Buffer.from(value, "utf-8");
    }
    onSubscribe(maxValueSize, callback) { this._updateFramesCallback = callback; }
    onUnsubscribe() { this._updateFramesCallback = null; }
    onFrame(frame) {
        if (this._updateFramesCallback) {
            this._updateFramesCallback(Buffer.from(frame.rawFrameStr, "utf-8"));
        }
    }
}
class BLEWriteCharacteristic extends safeBleno_1.Characteristic {
    constructor(uuid, value, onValueRead) {
        super({
            uuid: uuid,
            properties: ['write'],
        });
        this._tmp = undefined;
        this._counter = 0;
        if (onValueRead)
            this._onValueRead = onValueRead;
        else
            this._onValueRead = () => new Promise(r => r(false));
        setInterval(() => this.tryFlush(), 100);
    }
    tryFlush() {
        this._counter--;
        if (this._counter < 0 && this._tmp) {
            const tmp = this._tmp;
            this._tmp = undefined;
            var p = undefined;
            if (tmp)
                p = this._onValueRead(tmp);
            else
                p = new Promise((r) => r());
            p.then(result => {
            }).catch(err => {
                console.log(err);
            });
        }
        if (this._counter < 0)
            this._counter = 0;
    }
    onWriteRequest(data, offset, withoutResponse, callback) {
        if (!this._tmp) {
            this._tmp = data.toString();
            if (!this._tmp)
                this._tmp = "";
        }
        else {
            this._tmp += data.toString();
        }
        callback(BLEConstants_1.RESULT_SUCCESS);
        this._counter = 10;
    }
    ;
}
class BLEPrimaryService extends safeBleno_1.PrimaryService {
    constructor(characteristics) {
        super({
            uuid: 'bee5',
            characteristics: characteristics
        });
    }
}
class BLEPrimarySystemService extends safeBleno_1.PrimaryService {
    constructor(uuid) {
        super({
            uuid: uuid,
            characteristics: [
                new BLEAsyncDescriptionCharacteristic("0001", () => diskspace.diskspace().then(space => "" + space.free)),
                new BLEAsyncDescriptionCharacteristic("0002", () => diskspace.diskspace().then(space => "" + space.size)),
                new BLEAsyncDescriptionCharacteristic("0003", () => diskspace.diskspace().then(space => "" + space.used)),
                new BLEAsyncDescriptionCharacteristic("0004", () => diskspace.diskspace().then(space => "" + space.percent))
            ]
        });
    }
}
class BLEPrimaryNetworkService extends safeBleno_1.PrimaryService {
    constructor(uuid, name, intfs) {
        super({
            uuid: uuid,
            characteristics: [
                new BLEDescriptionCharacteristic("0001", name),
                new BLEAsyncDescriptionCharacteristic("0002", network.readInterface(intfs, "ip_address")),
                new BLEAsyncDescriptionCharacteristic("0003", network.readInterface(intfs, "mac_address")),
                new BLEAsyncDescriptionCharacteristic("0004", network.readInterface(intfs, "type")),
                new BLEAsyncDescriptionCharacteristic("0005", network.readInterface(intfs, "netmask")),
                new BLEAsyncDescriptionCharacteristic("0006", network.readInterface(intfs, "gateway_ip"))
            ]
        });
    }
}
class BLEPrimaryDeviceService extends safeBleno_1.PrimaryService {
    constructor(device) {
        super({
            uuid: device.getUUID(),
            characteristics: [
                new BLEAsyncDescriptionCharacteristic("0001", () => device.getInternalSerial()),
                new BLEAsyncDescriptionCharacteristic("0002", () => device.getSerial()),
                new BLEAsyncDescriptionCharacteristic("0003", () => device.getType()),
                new BLEAsyncDescriptionCharacteristic("0004", () => device.getConnectedState()),
                new BLEAsyncDescriptionCharacteristic("0005", () => device.getImpactedState()),
                new BLEAsyncDescriptionCharacteristic("0006", () => this.createSeenDeviceCallback()),
                new BLEWriteCharacteristic("0007", "Update", (value) => this._editType(value)),
                new BLEAsyncDescriptionCharacteristic("0008", () => device.getAdditionnalInfo1()),
                new BLEAsyncDescriptionCharacteristic("0009", () => device.getAdditionnalInfo2()),
                new BLEAsyncDescriptionCharacteristic("000A", () => device.getLatestFramesAsString()),
            ]
        });
        this.device = device;
    }
    _editType(new_type) {
        const type = device_1.default.instance.stringToType(new_type || "");
        return device_management.setType(this.device, type).then(device => {
            if (device)
                this.device = device;
            return !!device;
        });
    }
    tryUpdateDevice(device) {
        if (!this.device && device) {
            this.device = device;
        }
        else {
            Promise.all([
                this.device.getType(),
                device.getType()
            ]).then(types => {
                if (types && types.length == 2) {
                    if (types[0] != types[1]) {
                        this.device = device;
                    }
                }
            }).catch(err => { });
        }
    }
    createSeenDeviceCallback() {
        return this.device.getInternalSerial()
            .then(internal_serial => !!seenDevices.devices[internal_serial] ? "true" : "false");
    }
}
class BLEReadWriteLogCharacteristic extends BLESyncCharacteristic_1.BLELargeSyncCharacteristic {
    constructor(uuid, compress = false, use_write = true) {
        super(uuid, 50, compress, use_write, safeBleno_1.mtu);
    }
    getMaxFrame() {
        return frame_model_compress_1.default.instance.getMaxFrame();
    }
    getMinFrame() {
        return frame_model_compress_1.default.instance.getMinFrame();
    }
    getFrame(value, to_fetch) {
        return frame_model_compress_1.default.instance.getFrame(value, to_fetch);
    }
}
class BLEReadWriteLogIsAlertCharacteristic extends BLESyncCharacteristic_1.BLELargeSyncCharacteristic {
    constructor(uuid, compress = false, use_write = true) {
        super(uuid, 50, compress, use_write, safeBleno_1.mtu);
    }
    getMaxFrame() {
        return frame_model_1.default.instance.getMaxFrame();
    }
    getMinFrame() {
        return frame_model_1.default.instance.getMinFrame();
    }
    getFrame(value, to_fetch) {
        return frame_model_1.default.instance.getFrameIsAlert(value, to_fetch);
    }
    numberToFetch() {
        return 5;
    }
}
class BLE {
    constructor() {
        this._refreshing_called_once = false;
        this._started_advertising = false;
        this._started = false;
        this._started_advertising_ok = false;
        this._interval = undefined;
        if (!safeBleno_1.isBlenoAvailable) {
            console.log("disabling bluetooth... incompatible...");
            this._characteristics = [];
            this._refreshing_called_once = false;
            this._started_advertising = false;
            this._started = false;
            this._services = [];
            this._services_uuid = [];
            this._notify_frame = new BLEFrameNotify("0102", "Notify");
            this._ble_service = new BLEPrimaryService(this._characteristics);
            this._eth0_service = new BLEPrimaryNetworkService("bee6", "eth0", ["eth0", "en1"]);
            this._wlan0_service = new BLEPrimaryNetworkService("bee7", "wlan0", ["wlan0", "en0"]);
            this._system_service = new BLEPrimarySystemService("bee8");
            return;
        }
        //this._notify_frame = new BLEFrameNotify("0102", "Notify");
        this._characteristics = [
            new BLEDescriptionCharacteristic("0001", config_1.default.identity),
            new BLEDescriptionCharacteristic("0002", config_1.default.version),
            new BLEWriteCharacteristic("0101", "Wifi Config", (value) => this._onWifi(value)),
            new BLEWriteCharacteristic("0102", "Network Config", (value) => this._onNetwork(value)),
            new BLEAsyncDescriptionCharacteristic("0103", () => this._onDeviceSeenCall()),
            new BLEReadWriteLogCharacteristic("0104"),
            new BLEReadWriteLogCharacteristic("0105", true),
            new BLEReadWriteLogCharacteristic("0106", true, false),
            new BLEReadWriteLogIsAlertCharacteristic("0107", false, true)
            //this._notify_frame
        ];
        this._refreshing_called_once = false;
        this._ble_service = new BLEPrimaryService(this._characteristics);
        this._eth0_service = new BLEPrimaryNetworkService("bee6", "eth0", ["eth0", "en1"]);
        this._wlan0_service = new BLEPrimaryNetworkService("bee7", "wlan0", ["wlan0", "en0"]);
        this._system_service = new BLEPrimarySystemService("bee8");
        this._services = [
            this._ble_service,
            this._eth0_service,
            this._wlan0_service,
            this._system_service
        ];
        this._services_uuid = this._services.map(i => i.uuid);
        this._started_advertising = false;
        this._started = false;
    }
    needRepair() {
        return safeBleno_1.needBluetoothRepair;
    }
    refreshDevices() {
        if (!safeBleno_1.isBlenoAvailable) {
            return;
        }
        device_management.list()
            .then(devices => {
            const to_add = [];
            if (devices) {
                devices = devices.filter(device => device.getInternalSerial() && "ffffff" != device.getSyncInternalSerial());
                devices.forEach(device => {
                    var found = false;
                    this._services.forEach(service => {
                        const uuid_left = device.getUUID().toLowerCase();
                        const uuid_right = service.uuid.toLowerCase();
                        if (service && uuid_left == uuid_right) {
                            found = true;
                            service.tryUpdateDevice(device);
                        }
                    });
                    if (!found)
                        to_add.push(new BLEPrimaryDeviceService(device));
                });
                to_add.forEach(service => this._services.push(service));
            }
            if (!this._refreshing_called_once || to_add.length > 0) {
                this._refreshing_called_once = true;
                this._services_uuid = this._services.map(i => i.uuid).filter(u => u.indexOf("bee") >= 0);
                safeBleno_1.startAdvertising(id, this._services_uuid);
                if (this._started_advertising_ok) {
                    safeBleno_1.setServices(this._services, (err) => console.log('setServices: ' + (err ? 'error ' + err : 'success')));
                }
            }
        })
            .catch(err => {
            console.error(err);
            this._services_uuid = this._services.map(i => i.uuid).filter(u => u.indexOf("bee") >= 0);
            safeBleno_1.startAdvertising(id, this._services_uuid);
        });
    }
    start() {
        if (!safeBleno_1.isBlenoAvailable) {
            console.log("disabling bluetooth... incompatible...");
            return;
        }
        setTimeout(() => this.startDelayed(), 1000);
    }
    startDelayed() {
        if (!safeBleno_1.isBlenoAvailable) {
            console.log("disabling bluetooth... incompatible...");
            return;
        }
        if (this._started)
            return;
        frame_model_compress_1.default.instance.start();
        this._started = true;
        safeBleno_1.onBlenoEvent("mtuChange", (mtuValue) => {
            const global_mtu = mtuValue || 23;
            console.log("new mtu value", global_mtu);
        });
        safeBleno_1.onBlenoEvent('stateChange', (state) => {
            console.log('on -> stateChange: ' + state);
            if (state == 'poweredOn' && !this._started_advertising) {
                this._started_advertising = true;
                console.log("starting advertising for", this._services_uuid);
                this._interval = setInterval(() => this.refreshDevices(), 5000);
                this.refreshDevices();
            }
            else if (this._started_advertising) {
                this._started_advertising = false;
                console.log("stopping ", state);
                this._interval && clearInterval(this._interval);
                safeBleno_1.stopAdvertising();
            }
        });
        safeBleno_1.onBlenoEvent('advertisingStart', (err) => {
            console.log('on -> advertisingStart: ' + (err ? 'error ' + err : 'success'));
            if (!err && this._started_advertising) {
                this._started_advertising_ok = true;
                safeBleno_1.setServices(this._services, (err) => {
                    console.log('setServices: ' + (err ? 'error ' + err : 'success'));
                });
            }
        });
        safeBleno_1.onBlenoEvent("advertisingStop", (err) => this._started_advertising_ok = false);
        safeBleno_1.onBlenoEvent("advertisingStartError", (err) => console.log(err));
        safeBleno_1.onBlenoEvent("disconnect", (client) => console.log("disconnect : client ->", client));
    }
    onFrame(frame) {
        if (!safeBleno_1.isBlenoAvailable) {
            console.log("disabling bluetooth... incompatible...");
            return;
        }
        console.log("sending frame");
        this._notify_frame && this._notify_frame.onFrame(frame);
        device_management.onFrame(frame)
            .then((device) => {
            if (device) {
                device.getInternalSerial()
                    .then((internal_serial) => {
                    if (internal_serial && !seenDevices.devices[internal_serial]) {
                        seenDevices.devices[internal_serial] = true;
                        seenDevices.count++;
                    }
                });
            }
        });
    }
    _onDeviceSeenCall() {
        return new Promise((resolve, reject) => {
            resolve("" + seenDevices.count);
        });
    }
    json(value) {
        var json = {};
        try {
            json = JSON.parse(value);
        }
        catch (e) {
            console.error(e);
        }
        return json;
    }
    _onNetwork(value) {
        var j = undefined;
        const tmp = this.json(value);
        var net_interface = "";
        console.log("network " + tmp.password + " " + visualisation_1.default.password);
        if (tmp.password === visualisation_1.default.password) {
            console.log("configuration valid found, saving it");
            if (tmp.interface) {
                if ("eth0" == tmp.interface)
                    net_interface = "eth0";
                else if ("wlan0" == tmp.interface)
                    net_interface = "wlan0";
            }
            if (tmp.ip && tmp.netmask && tmp.broadcast && tmp.gateway) {
                j = { ip: tmp.ip, netmask: tmp.netmask, broadcast: tmp.broadcast, gateway: tmp.gateway, restart: true };
            }
            else if (tmp.dhcp) {
                j = { dhcp: true, restart: true };
            }
            return new Promise((resolve, reject) => {
                network.configure(net_interface, j, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve(true);
                });
            });
        }
        return new Promise((r, reject) => reject("invalid"));
    }
    _onWifi(value) {
        var json = undefined;
        const tmp = this.json(value);
        if (tmp.password === visualisation_1.default.password && tmp.ssid && tmp.passphrase) {
            console.log("configuration valid found, saving it");
            json = { ssid: tmp.ssid, passphrase: tmp.passphrase };
        }
        if (!json)
            return new Promise((r, reject) => reject("invalid"));
        return wifi.storeConfiguration(json)
            .then(success => {
            if (success === true)
                console.log("configuration saved");
            else
                console.log("error while saving");
            return success;
        }).catch(err => {
            console.log("error while saving", err);
            return false;
        });
    }
}
exports.default = BLE;
//# sourceMappingURL=ble.js.map