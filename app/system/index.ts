import { Command } from './Command';
import os from "os";
//@ts-ignore
import fd from "fd-diskspace";
import { DU, exists } from "../systemctl";

export interface Space {
    free: number;
    size: number;
    used: number;
    percent: number;
}

export class SystemInfo {
    private command = new Command();
    public static instance = new SystemInfo();

    uname = (): Promise<string> => this.command.exec("/bin/uname", ["-a"]);

    uptime = (): Promise<string> => Promise.resolve("" + os.uptime());

    arch = (): Promise<string> => Promise.resolve("" + os.arch());

    release = (): Promise<string> => Promise.resolve("" + os.release());

    version = (): Promise<string> => Promise.resolve("" + process.version);

    platform = (): Promise<string> => Promise.resolve("" + process.platform);

    cpuinfo = (): Promise<string> => this.command.exec("/bin/cat", ["/proc/cpuinfo"]);

    isv6l(): Promise<boolean> {
        return this.cpuinfo()
        .then(cpuinfo => !!(cpuinfo && cpuinfo.indexOf('(v6l)') >= 0));
    }

    canBeRepaired(): Promise<boolean> {
        return this.isv6l()
        .then(isv6l => {
            const tar = isv6l ? "node-v8.17.0-linux-armv6l.tar.gz" : "node-v8.17.0-linux-armv7l.tar.gz";
            return exists(`/home/nonopn/${tar}`);
        });
    }

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