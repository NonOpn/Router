"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const frame_model_1 = __importDefault(require("./../push_web/frame_model"));
const data_point_1 = __importDefault(require("../database/data_point"));
const snmpjs_1 = __importDefault(require("snmpjs"));
class AbstractDevice {
    constructor() {
        this.agent = undefined;
        this.params = undefined;
        this.data_point_provider = new data_point_1.default();
    }
    setParams(params) {
        this.params = params;
        if (!this.params.no_snmp) {
            this.agent = snmpjs_1.default.createAgent();
            this.agent.request(this.asMib());
        }
        this.snmp = snmpjs_1.default;
        //this.data_point_provider = new DataPoint();
    }
    getId() {
        const lpsfr = this.getLPSFR();
        return lpsfr && lpsfr.id ? lpsfr.id : 0;
    }
    getUUID() {
        var uuid = this.getId().toString(16);
        if (uuid.length)
            while (uuid.length < 4)
                uuid = "0" + uuid;
        return uuid;
    }
    getSerial() {
        return this._getPromiseCharacteristic("serial");
    }
    getInternalSerial() {
        return this._getPromiseCharacteristic("internal");
    }
    getType() {
        return this._getPromiseCharacteristic("type");
    }
    setType(type) {
        if (!type)
            return new Promise(r => r(true));
        return this._setPromiseCharacteristic("type", type || "paratonair");
    }
    _getPromiseCharacteristic(name) {
        return new Promise((resolve, reject) => {
            if (this.params && this.params.lpsfr)
                resolve(this.params.lpsfr[name]);
            else
                resolve("");
        });
    }
    _setPromiseCharacteristic(name, value) {
        return new Promise((resolve, reject) => {
            if (this.params && this.params.lpsfr)
                this.params.lpsfr[name] = value;
            resolve(true);
        });
    }
    getSyncInternalSerial() {
        return this.params && this.params.lpsfr ? this.params.lpsfr.internal : undefined;
    }
    getConnectedStateString(item) {
        return "not_implemented";
    }
    getImpactedString(item) {
        return "not_implemented";
    }
    getAdditionnalInfo1String(item) {
        return "not_implemented";
    }
    getAdditionnalInfo2String(item) {
        return "not_implemented";
    }
    getLPSFR() {
        return this.params.lpsfr;
    }
    getLatest() {
        const filter = this.getStandardFilter();
        return this.data_point_provider.findMatching(filter.key, filter.value);
    }
    getLatestFrames() {
        return frame_model_1.default.instance.lasts(this.getId(), 5);
    }
    getFormattedLatestFrames() {
        return Promise.reject("invalid");
    }
    getLatestFramesAsString() {
        return this.getFormattedLatestFrames()
            .then(array => JSON.stringify(array))
            .catch(err => { console.log(err); return JSON.stringify({ error: true }); });
    }
    getAdditionnalInfo1() {
        return this.getLatest()
            .then(item => this.getAdditionnalInfo1String(item));
    }
    getAdditionnalInfo2() {
        return this.getLatest()
            .then(item => this.getAdditionnalInfo2String(item));
    }
    getLatests() {
        return this.getLatest()
            .then(item => this.getAdditionnalInfo2String(item));
    }
    getConnectedState() {
        return this.getLatest()
            .then(item => this.getConnectedStateString(item));
    }
    getImpactedState() {
        return this.getLatest()
            .then(item => this.getImpactedString(item));
    }
    getStandardFilter() { throw "must be defined"; }
    asMib() { throw "must be defined"; }
    sendString(prq, string) {
        if (!string || string.length === 0)
            string = " ";
        var val = snmpjs_1.default.data.createData({
            type: "OctetString",
            value: string
        });
        snmpjs_1.default.provider.readOnlyScalar(prq, val);
    }
    bind() {
        if (this.agent) {
            console.log("bind done", this.params.port);
            this.agent.bind({ family: 'udp4', port: this.params.port });
        }
    }
}
exports.default = AbstractDevice;
//# sourceMappingURL=abstract.js.map