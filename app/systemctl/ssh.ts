const { spawn } = require('child_process');

class Systemctl {

    exec(action: string, service: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const ssh = spawn('/bin/systemctl', [action, service]);
            this._launch(resolve, reject, ssh);
        });
    }

    _launch(resolve: any, reject: any, ssh: any) {
        var output = "";

        ssh.stdout.on("data", (data: any) => output += data);

        ssh.on('close', (code: any) => {
            console.log(`child process exited with code ${code}`);
            resolve(output);
        });
    }

}

export class MySQL {
    systemctl: Systemctl;

    constructor() {
        this.systemctl = new Systemctl();
    }

    status = (): Promise<string> => this.systemctl.exec("status", "mysql");

    start = (): Promise<string> => this.systemctl.exec("start", "mysql");
}

export class SSH {
    systemctl: Systemctl;

    constructor() {
        this.systemctl = new Systemctl();
    }

    stop = (): Promise<boolean> => this._executeCmd("stop");

    disable = (): Promise<boolean> => this._executeCmd("disable");

    start = (): Promise<boolean> => this._executeCmd("start");

    enable = (): Promise<boolean> => this._executeCmd("enable");

    _executeCmd = (main: string): Promise<boolean> => this.systemctl.exec(main, "ssh").then(() => true);
}