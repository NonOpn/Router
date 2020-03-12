"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = require("./Command");
const os_1 = __importDefault(require("os"));
const fd_diskspace_1 = __importDefault(require("fd-diskspace"));
const systemctl_1 = require("../systemctl");
class SystemInfo {
    constructor() {
        this.command = new Command_1.Command();
        this.uname = () => this.command.exec("/bin/uname", ["-a"]);
        this.uptime = () => Promise.resolve("" + os_1.default.uptime());
        this.arch = () => Promise.resolve("" + os_1.default.arch());
        this.release = () => Promise.resolve("" + os_1.default.release());
        this.version = () => Promise.resolve("" + process.version);
        this.platform = () => Promise.resolve("" + process.platform);
        this.cpuinfo = () => this.command.exec("/bin/cat", ["/proc/cpuinfo"]);
    }
    isv6l() {
        return this.cpuinfo()
            .then(cpuinfo => !!(cpuinfo && cpuinfo.indexOf('(v6l)') >= 0));
    }
    canBeRepaired() {
        return this.isv6l()
            .then(isv6l => {
            const tar = isv6l ? "node-v8.17.0-linux-armv6l.tar.gz" : "node-v8.17.0-linux-armv7l.tar.gz";
            return systemctl_1.exists(`/home/nonopn/${tar}`);
        });
    }
}
SystemInfo.instance = new SystemInfo();
exports.SystemInfo = SystemInfo;
class Diskspace {
    constructor() {
        this.du = new systemctl_1.DU();
    }
    diskspace() {
        return new Promise((resolve, reject) => {
            fd_diskspace_1.default.diskSpace((err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    var res = { free: 0, size: 0, used: 0, percent: 0 };
                    if (result && result.total) {
                        res.free = result.total.free || 0;
                        res.size = result.total.size || 0;
                        res.used = result.total.used || 0;
                        res.percent = result.total.percent || 0;
                    }
                    resolve(res);
                }
            });
        });
    }
    usage() {
        return this.du.exec("/", 1);
    }
}
Diskspace.instance = new Diskspace();
exports.Diskspace = Diskspace;
//# sourceMappingURL=index.js.map