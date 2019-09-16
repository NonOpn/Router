const { spawn } = require('child_process');

export default class SSH {
    constructor() {

    }

    stop(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const ssh = spawn('/bin/systemctl', ['stop', 'ssh']);
            this._launch(resolve, reject, ssh);
        });
    }

    disable(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const ssh = spawn('/bin/systemctl', ['disable', 'ssh']);
            this._launch(resolve, reject, ssh);
        });
    }

    _launch(resolve: any, reject: any, ssh: any) {
        ssh.on('close', (code: any) => {
            console.log(`child process exited with code ${code}`);
            resolve(true);
        });
    }
}