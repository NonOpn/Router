import os from "os";
const { spawn } = require('child_process');
import fd from "fd-diskspace";
import { DU } from "../systemctl";

export interface Space {
    free: number;
    size: number;
    used: number;
    percent: number;
}


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

export class SystemInfo {
    private command = new Command();
    public static instance = new SystemInfo();

    uname = (): Promise<string> => this.command.exec("uname", ["-a"]);

    uptime = (): Promise<string> => Promise.resolve("" + os.uptime());

    arch = (): Promise<string> => Promise.resolve("" + os.arch());

    release = (): Promise<string> => Promise.resolve("" + os.release());

    version = (): Promise<string> => Promise.resolve("" + process.version);

    platform = (): Promise<string> => Promise.resolve("" + process.platform);

}

export class Diskspace {

    private du: DU;
    public static instance = new Diskspace();

    constructor() {
        this.du = new DU();
    }

    public diskspace(): Promise<Space> {
        return new Promise<Space>((resolve, reject) => {
            fd.diskSpace((err: Error, result: any) => {
                if(err) {
                    reject(err);
                } else {
                    var res: Space = { free: 0, size: 0, used: 0, percent: 0 };
                    if(result && result.total) {
                        res.free = result.total.free || 0;
                        res.size = result.total.size || 0;
                        res.used = result.total.used || 0;
                        res.percent = result.total.percent || 0;
                    }
                    resolve(res);
                }
            });
        });
    }

    public usage(): Promise<string> {
        return this.du.exec("/", 1);
    }
}