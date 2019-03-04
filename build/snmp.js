"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const snmp_json_1 = __importDefault(require("../config/snmp.json"));
const snmpjs_1 = __importDefault(require("snmpjs"));
const data_point_1 = __importDefault(require("./database/data_point"));
const paratonair_1 = __importDefault(require("./snmp/paratonair"));
const alertairdc_1 = __importDefault(require("./snmp/alertairdc"));
const ellips_1 = __importDefault(require("./snmp/ellips"));
const array = {
    paratonair: paratonair_1.default,
    comptair: paratonair_1.default,
    alertairdc: alertairdc_1.default,
    ellips: ellips_1.default
};
const VERSION = "0.1";
function instantiate(params) {
    if (params && params.lpsfr) {
        const klass = array[params.lpsfr.type];
        if (klass) {
            return new (klass)(params);
        }
    }
    return undefined;
}
class SNMP extends events_1.EventEmitter {
    constructor() {
        super();
        this.agents = [];
        this.data_point_provider = new data_point_1.default();
    }
    onFrame(data) {
        if (data && data.sender) {
            this.applyData(data);
        }
    }
    applyData(data) {
        if (data && data.rawFrameStr) {
            //rawFrameStr and rawDataStr are set
            if (data.rawFrameStr.length === 60) {
                const rawdata = data.rawDataStr;
                const internal = rawdata.substring(0, 6);
                const callback = () => {
                    this.agents.forEach(agent => {
                        var lpsfr = agent != undefined ? agent.getLPSFR() : {};
                        if (rawdata.length > 6 && (lpsfr.type === "paratonair" || lpsfr.type === "comptair")) {
                            const config_internal = lpsfr.internal.substring(0, 6);
                            if (internal === config_internal) {
                                console.log("having internal correct");
                                this.data_point_provider.savePoint(lpsfr.serial, config_internal, data.sender, data.rawDataStr);
                            }
                        }
                    });
                };
                if (internal === "ffffff") {
                    console.log("having a ffffff serial, disconnected or impacted", data.sender);
                    this.data_point_provider.latestForContactair(data.sender)
                        .then(item => {
                        if (item) {
                            this.data_point_provider.savePoint(item.serial, item.internal, data.sender, data.rawDataStr);
                            console.log("saving to " + item.serial + " " + item.internal + " " + data.sender + " " + data.rawDataStr);
                        }
                        else {
                            callback();
                        }
                    }).catch(err => {
                        console.log(err);
                        callback();
                    });
                }
                else {
                    callback();
                }
            }
            else if (data.rawFrameStr.length === 48) {
                this.agents.forEach(agent => {
                    const lpsfr = agent.getLPSFR();
                    if (lpsfr.internal === data.sender && lpsfr.type === "ellips") {
                        this.data_point_provider.savePoint(lpsfr.serial, lpsfr.internal, data.sender, data.rawDataStr);
                    }
                });
            }
        }
    }
    connect() {
        this.agent = snmpjs_1.default.createAgent();
        var mib = [{
                oid: snmp_json_1.default.router_oid + ".1",
                handler: (prq) => {
                    var val = snmpjs_1.default.data.createData({
                        type: "OctetString",
                        value: "Rout@ir v" + VERSION
                    });
                    snmpjs_1.default.provider.readOnlyScalar(prq, val);
                }
            },
            {
                oid: snmp_json_1.default.router_oid + ".2",
                handler: (prq) => {
                    var val = snmpjs_1.default.data.createData({
                        type: "OctetString",
                        value: new Date().toString()
                    });
                    snmpjs_1.default.provider.readOnlyScalar(prq, val);
                }
            }];
        snmp_json_1.default.agents.forEach((conf) => {
            try {
                const instance = instantiate(conf);
                instance.asMib().forEach((sub_mib) => {
                    mib.push(sub_mib);
                });
                this.agents.push(instance);
            }
            catch (e) {
                console.log(e);
            }
        });
        this.agent.request(mib);
        this.agent.bind({ family: 'udp4', port: 161 });
    }
}
exports.default = SNMP;
//# sourceMappingURL=snmp.js.map