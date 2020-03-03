const { spawn } = require('child_process');
const fs = require('fs')


export class Command {

    exec(exe: string, args: string[] = []): Promise<string> {
        return new Promise((resolve, reject) => {
            const cmd = spawn(exe, args);
            this._launch(resolve, reject, cmd);
        });
    }

    _launch(resolve: any, reject: any, cmd: any) {
        var output = "";

        cmd.stdout.on("data", (data: any) => output += data);

        try {
            cmd.stderr.on("data", (data: any) => output += data);
        } catch(e) {
            output += "error " + e;
        }

        cmd.on('close', (code: any) => resolve(output));
    }
}
export class Systemctl {
    exec(action: string, service: string): Promise<string> {
        return new Command().exec('/bin/systemctl', [action, service]);
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

export class Apt {
    command: Command = new Command();

    list = (): Promise<string> => this.command.exec("/usr/bin/apt", ["list", "--installed"]);

    install = (pack: string): Promise<string> => this.command.exec("/usr/bin/apt", ["install", "-y", pack]);
}

export class Which {
    command: Command = new Command();

    which = (cmd: string): Promise<string> => this.command.exec("/usr/bin/which", [cmd]);
}

export class Bluetooth {
    systemctl: Systemctl;
    command: Command = new Command();

    constructor() {
        this.systemctl = new Systemctl();
    }

    status = (): Promise<string> => this.systemctl.exec("status", "bluetooth");

    start = (): Promise<string> => this.systemctl.exec("start", "bluetooth");

    restart = (): Promise<string> => this.systemctl.exec("restart", "bluetooth");

    hcistatus = (): Promise<string> => this.command.exec("/bin/hciconfig");

    up = (): Promise<string> => this.command.exec("/bin/hciconfig", ["hci0", "up"]);
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
    exec(package_name: string, npm: string = "/usr/bin/npm"): Promise<{output: string, code: number}> {
        console.log("using path", {package_name, npm})
        return new Promise((resolve, reject) => {
            var output = "";
            const cmd = spawn(npm, ["rebuild", package_name]);
            cmd.stdout.on("data", (data: any) => output += data);
            cmd.stderr.on("data", (data: any) => output += data);

            cmd.on('close', (code: any) => {
                resolve({output, code});
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