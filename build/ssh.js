"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { spawn } = require('child_process');
class SSH {
    constructor() {
    }
    stop() {
        return this._executeCmd("stop");
    }
    disable() {
        return this._executeCmd("disable");
    }
    start() {
        return this._executeCmd("start");
    }
    enable() {
        return this._executeCmd("enable");
    }
    _executeCmd(main) {
        return new Promise((resolve, reject) => {
            const ssh = spawn('/bin/systemctl', [main, 'ssh']);
            this._launch(resolve, reject, ssh);
        });
    }
    _launch(resolve, reject, ssh) {
        ssh.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            resolve(true);
        });
    }
}
exports.default = SSH;
//# sourceMappingURL=ssh.js.map