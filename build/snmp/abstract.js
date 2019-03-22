"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
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
        if (lpsfr && lpsfr.id)
            return lpsfr.id;
        return 0;
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
    _getPromiseCharacteristic(name) {
        return new Promise((resolve, reject) => {
            if (this.params && this.params.lpsfr)
                resolve(this.params.lpsfr[name]);
            else
                resolve("");
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
    getLPSFR() {
        return this.params.lpsfr;
    }
    getLatest() {
        return this.data_point_provider.findLatestWithParams(this.getStandardFilter());
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