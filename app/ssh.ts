const { spawn } = require('child_process');

export default class SSH {
    constructor() {

    }

    stop(): Promise<boolean> {
        return this._executeCmd("stop");
    }

    disable(): Promise<boolean> {
        return this._executeCmd("disable");
    }

    start(): Promise<boolean> {
        return this._executeCmd("start");
    }

    enable(): Promise<boolean> {
        return this._executeCmd("enable");
    }

    _executeCmd(main: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const ssh = spawn('/bin/systemctl', [main, 'ssh']);
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