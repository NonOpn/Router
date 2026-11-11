"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//@ts-ignore
const network_1 = __importDefault(require("network"));
//@ts-ignore
const network_config_1 = __importDefault(require("network-config"));
const fs_1 = __importDefault(require("fs"));
// the Huawei modem (12d1:1f01 switched by usb_modeswitch) is exposed as eth1 on older kernels
// and usb0 on newer ones ; wwan0 / ppp0 for qmi or ppp based modems
const CELLULAR_INTERFACES = ["eth1", "usb0", "wwan0", "ppp0"];
class NetworkInfo {
    constructor() {
        this._list = [];
        // the first echo and ping need the interfaces : to report them and to know if the SIM is used
        this._ready = new Promise(resolve => {
            this._refreshNetwork(() => resolve());
            setTimeout(() => resolve(), 10000);
        });
        setInterval(() => this._refreshNetwork(), 5000);
    }
    _refreshNetwork(callback) {
        try {
            network_1.default.get_interfaces_list((err, list) => {
                err && console.log(err);
                this._list = list || [];
                callback && callback();
            });
        }
        catch (e) {
            callback && callback();
        }
    }
    /**
     * Resolved once the interfaces are known, 10s at most
     */
    ready() {
        return this._ready;
    }
    list() {
        return (this._list || []).filter(i => !!i);
    }
    isCellular(name) {
        return !!name && CELLULAR_INTERFACES.indexOf(name) >= 0;
    }
    isGPRS() {
        return !!this.list().find(i => this.isCellular(i.name));
    }
    // wlan0 can be up for the "local wifi" mode, the operstate & gateway tells which one is really used
    states() {
        return this.list().map(i => {
            const name = i.name || "";
            var operstate = "unknown";
            try {
                operstate = fs_1.default.readFileSync(`/sys/class/net/${name}/operstate`).toString().trim();
            }
            catch (e) {
            }
            return {
                name,
                cellular: this.isCellular(name),
                operstate,
                ip_address: i.ip_address || undefined,
                gateway_ip: i.gateway_ip || undefined,
                type: i.type || undefined
            };
        });
    }
    interf(interf) {
        if (this._list) {
            const filter = this._list.filter(i => i && i.name === interf);
            if (filter && filter.length > 0)
                return filter[0];
        }
        return undefined;
    }
    readInterface(names, key) {
        return () => new Promise(resolve => {
            var infos = names.map(i => this.interf(i)).filter(i => undefined != i);
            var info = infos.length > 0 ? infos[0] : undefined;
            var value = undefined;
            if (info)
                value = info[key];
            if (!value)
                value = "";
            resolve(value);
        });
    }
    configure(name, description, callback) {
        network_config_1.default.configure(name, description, callback);
    }
}
NetworkInfo.instance = new NetworkInfo();
exports.default = NetworkInfo;
//# sourceMappingURL=index.js.map