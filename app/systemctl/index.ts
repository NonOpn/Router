const { spawn } = require('child_process');
const fs = require('fs')

export class Systemctl {

    exec(action: string, service: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const ssh = spawn('/bin/systemctl', [action, service]);
            this._launch(resolve, reject, ssh);
        });
    }

    _launch(resolve: any, reject: any, ssh: any) {
        var output = "";

        ssh.stdout.on("data", (data: any) => output += data);

        ssh.on('close', (code: any) => resolve(output));
    }

}

export class MySQL {
    systemctl: Systemctl;

    constructor() {
        this.systemctl = new Systemctl();
    }

    status = (): Promise<string> => this.systemctl.exec("status", "mysql");

    start = (): Promise<string> => this.systemctl.exec("start", "mysql");

    restart = (): Promise<string> => this.systemctl.exec("restart", "mysql");
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

const _exists = (file: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        fs.access(file, fs.F_OK, (err: Error) => {
            if (err) {
                console.error(err);
                resolve(false);
            } else {
                resolve(true);
            }
        })
    })
}

export const exists = _exists;

export const npm = (): Promise<string> => {
    const path = `/usr/local/node-${process.version}/bin/npm`
    return _exists(path).then(ok => ok ? path : "/usr/bin/npm");
}

export class Rebuild {
    exec(package_name: string, npm: string = "/usr/bin/npm"): Promise<string> {
        console.log("using path", {package_name, npm})
        return new Promise((resolve, reject) => {
            var output = "";
            const cmd = spawn(npm, ["rebuild", package_name]);
            cmd.stdout.on("data", (data: any) => output += data);
            cmd.stderr.on("data", (data: any) => output += data);

            cmd.on('close', (code: any) => {
                resolve(output);
            });
        });
    }
}

export class DU {
    exec(path: string, depth: number): Promise<string> {
        return new Promise((resolve, reject) => {
            var output = "";
            const cmd = spawn('/usr/bin/du', ["-h", "-d", ""+depth, path]);
            cmd.stdout.on("data", (data: any) => output += data);

            cmd.on('close', (code: any) => {
                resolve(output);
            });
        });
    }
}

export class Cat {
    exec(filepath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            var output = "";
            const cmd = spawn('/bin/cat', [filepath]);
            cmd.stdout.on("data", (data: any) => output += data);

            cmd.on('close', (code: any) => {
                resolve(output);
            });
        });
    }
}

export class MysqlAdmin {
    exec(command: string, user: string, password: string): Promise<string> {
        return new Promise((resolve, reject) => {
            var output = "";
            const cmd = spawn('/usr/bin/mysqladmin', [command, "-u", user, "p"+password]);
            cmd.stdout.on("data", (data: any) => output += data);

            cmd.on('close', (code: any) => {
                resolve(output);
            });
        });
    }
}