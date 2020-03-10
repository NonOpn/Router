"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { spawn } = require('child_process');
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
//# sourceMappingURL=Command.js.map