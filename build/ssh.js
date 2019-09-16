"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { spawn } = require('child_process');
class SSH {
    constructor() {
    }
    stop() {
        return new Promise((resolve, reject) => {
            const ssh = spawn('/bin/systemctl', ['stop', 'ssh']);
            this._launch(resolve, reject, ssh);
        });
    }
    disable() {
        return new Promise((resolve, reject) => {
            const ssh = spawn('/bin/systemctl', ['disable', 'ssh']);
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