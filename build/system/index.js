"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const { spawn } = require('child_process');
const fd_diskspace_1 = __importDefault(require("fd-diskspace"));
const systemctl_1 = require("../systemctl");
class Command {
    exec(exe, args = []) {
        return new Promise((resolve, reject) => {
            const cmd = spawn(exe, args);
            this._launch(resolve, reject, cmd);
        });
    }
    _launch(resolve, reject, cmd) {
        var output = "";
        cmd.stdout.on("data", (data) => output += data);
        try {
            cmd.stderr.on("data", (data) => output += data);
        }
        catch (e) {
            output += "error " + e;
        }
        cmd.on('close', (code) => resolve(output));
    }
}
exports.Command = Command;
class SystemInfo {
    constructor() {
        this.command = new Command();
        this.uname = () => this.command.exec("uname", ["-a"]);
        this.uptime = () => Promise.resolve("" + os_1.default.uptime());
        this.arch = () => Promise.resolve("" + os_1.default.arch());
        this.release = () => Promise.resolve("" + os_1.default.release());
        this.version = () => Promise.resolve("" + process.version);
        this.platform = () => Promise.resolve("" + process.platform);
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