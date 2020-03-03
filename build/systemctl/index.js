"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { spawn } = require('child_process');
const fs = require('fs');
class Command {
    exec(exe, args = []) {
        return new Promise((resolve, reject) => {
            const ssh = spawn(exe, args);
            this._launch(resolve, reject, ssh);
        });
    }
    _launch(resolve, reject, ssh) {
        var output = "";
        ssh.stdout.on("data", (data) => output += data);
        ssh.on('close', (code) => resolve(output));
    }
}
exports.Command = Command;
class Systemctl {
    exec(action, service) {
        return new Command().exec('/bin/systemctl', [action, service]);
    }
}
exports.Systemctl = Systemctl;
class MySQL {
    constructor() {
        this.status = () => this.systemctl.exec("status", "mysql");
        this.start = () => this.systemctl.exec("start", "mysql");
        this.restart = () => this.systemctl.exec("restart", "mysql");
        this.systemctl = new Systemctl();
    }
}
exports.MySQL = MySQL;
class Apt {
    constructor() {
        this.command = new Command();
        this.list = () => this.command.exec("/usr/bin/apt", ["list", "--installed"]);
    }
}
exports.Apt = Apt;
class Which {
    constructor() {
        this.command = new Command();
        this.which = (cmd) => this.command.exec("/usr/bin/which", [cmd]);
    }
}
exports.Which = Which;
class Bluetooth {
    constructor() {
        this.command = new Command();
        this.status = () => this.systemctl.exec("status", "bluetooth");
        this.start = () => this.systemctl.exec("start", "bluetooth");
        this.restart = () => this.systemctl.exec("restart", "bluetooth");
        this.hcistatus = () => this.command.exec("/bin/hciconfig");
        this.up = () => this.command.exec("/bin/hciconfig", ["hci0", "up"]);
        this.systemctl = new Systemctl();
    }
}
exports.Bluetooth = Bluetooth;
class SSH {
    constructor() {
        this.stop = () => this._executeCmd("stop");
        this.disable = () => this._executeCmd("disable");
        this.start = () => this._executeCmd("start");
        this.enable = () => this._executeCmd("enable");
        this._executeCmd = (main) => this.systemctl.exec(main, "ssh").then(() => true);
        this.systemctl = new Systemctl();
    }
}
exports.SSH = SSH;
const _exists = (file) => {
    return new Promise((resolve, reject) => {
        fs.access(file, fs.F_OK, (err) => {
            if (err) {
                console.error(err);
                resolve(false);
            }
            else {
                resolve(true);
            }
        });
    });
};
exports.exists = _exists;
exports.npm = () => {
    const path = `/usr/local/node-${process.version}/bin/npm`;
    return _exists(path).then(ok => ok ? path : "/usr/bin/npm");
};
class Rebuild {
    exec(package_name, npm = "/usr/bin/npm") {
        console.log("using path", { package_name, npm });
        return new Promise((resolve, reject) => {
            var output = "";
            const cmd = spawn(npm, ["rebuild", package_name]);
            cmd.stdout.on("data", (data) => output += data);
            cmd.stderr.on("data", (data) => output += data);
            cmd.on('close', (code) => {
                resolve({ output, code });
            });
        });
    }
}
exports.Rebuild = Rebuild;
class DU {
    exec(path, depth) {
        return new Promise((resolve, reject) => {
            var output = "";
            const cmd = spawn('/usr/bin/du', ["-h", "-d", "" + depth, path]);
            cmd.stdout.on("data", (data) => output += data);
            cmd.on('close', (code) => {
                resolve(output);
            });
        });
    }
}
exports.DU = DU;
class Cat {
    exec(filepath) {
        return new Promise((resolve, reject) => {
            var output = "";
            const cmd = spawn('/bin/cat', [filepath]);
            cmd.stdout.on("data", (data) => output += data);
            cmd.on('close', (code) => {
                resolve(output);
            });
        });
    }
}
exports.Cat = Cat;
class MysqlAdmin {
    exec(command, user, password) {
        return new Promise((resolve, reject) => {
            var output = "";
            const cmd = spawn('/usr/bin/mysqladmin', [command, "-u", user, "p" + password]);
            cmd.stdout.on("data", (data) => output += data);
            cmd.on('close', (code) => {
                resolve(output);
            });
        });
    }
}
exports.MysqlAdmin = MysqlAdmin;
//# sourceMappingURL=index.js.map