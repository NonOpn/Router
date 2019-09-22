"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { spawn } = require('child_process');
class Systemctl {
    exec(action, service) {
        return new Promise((resolve, reject) => {
            const ssh = spawn('/bin/systemctl', [action, service]);
            this._launch(resolve, reject, ssh);
        });
    }
    _launch(resolve, reject, ssh) {
        var output = "";
        ssh.stdout.on("data", (data) => output += data);
        ssh.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            resolve(output);
        });
    }
}
class MySQL {
    constructor() {
        this.status = () => this.systemctl.exec("status", "mysql");
        this.start = () => this.systemctl.exec("start", "mysql");
        this.restart = () => this.systemctl.exec("restart", "mysql");
        this.systemctl = new Systemctl();
    }
}
exports.MySQL = MySQL;
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
//# sourceMappingURL=index.js.map