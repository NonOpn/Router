import { Command } from './../system/Command';
const { spawn } = require('child_process');
const fs = require('fs')


export type ANTENNA = "bluetooth"|"wifi";

export class RfKill {

    list(): Promise<string> {
        return new Command().exec('/bin/rfkill', ["list"]);
    }

    unblock(mode: ANTENNA): Promise<string> {
        return new Command().exec('/bin/rfkill', ["unblock", mode]);
    }

    block(mode: ANTENNA): Promise<string> {
        return new Command().exec('/bin/rfkill', ["block", mode]);
    }
}

export class AptCache {
    private exec(action: string, service: string): Promise<string> {
        return new Command().exec('/usr/bin/apt-cache', [action, service]);
    }

    private rpiBootloader() {
        return this.exec("show", "raspberrypi-bootloader")
        .then(output => {
            if(!output || output.length < 30) throw "invalid bootloader info"
            return output;
        })
    }

    isLatest() {
        return this.rpiBootloader().then(output => {
            const version = this.findVersion(output);
            return version.indexOf("1.20170703-1") >= 0;
        });
    }

    findVersion(output: string) {
        if(output && output.length > 0) {
            var spl = output.split("\n");
            if(spl.length > 0) {
                const version = spl.filter(s => s.indexOf("Version:") == 0);
                return version;
            }
        }
        return "";
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
    installs = (packs: string[]): Promise<string> => {
        const array = ["install", "-y"];
        packs.forEach(pack => array.push(pack));
        return this.command.exec("/usr/bin/apt", array);
    };
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

export class Network {
    private cmd: Command = new Command();

    ifup(interf: string): Promise<boolean> {
        return this.cmd.exec("/sbin/ifup", [interf, "--force"]).then(() => true);
    }

    ifdown(interf: string): Promise<boolean> {
        return this.cmd.exec("/sbin/ifdown", [interf, "--force"]).then(() => true);
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