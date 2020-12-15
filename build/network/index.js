"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const network_1 = __importDefault(require("network"));
const network_config_1 = __importDefault(require("network-config"));
class NetworkInfo {
    constructor() {
        this._list = [];
        setInterval(() => this._refreshNetwork(), 5000);
    }
    _refreshNetwork() {
        network_1.default.get_interfaces_list((err, list) => {
            err && console.log(err);
            this._list = list || [];
        });
    }
    list() {
        return (this._list || []).filter(i => !!i);
    }
    isGPRS() {
        return this.list().find(i => i.name === "eth1");
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
exports.default = NetworkInfo;
NetworkInfo.instance = new NetworkInfo();
//# sourceMappingURL=index.js.map