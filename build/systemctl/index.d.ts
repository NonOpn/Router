import { Command } from "../system";
export declare type ANTENNA = "bluetooth" | "wifi";
export declare class RfKill {
    list(): Promise<string>;
    unblock(mode: ANTENNA): Promise<string>;
    block(mode: ANTENNA): Promise<string>;
}
export declare class AptCache {
    private exec(action, service);
    private rpiBootloader();
    isLatest(): Promise<boolean>;
    findVersion(output: string): string[] | "";
}
export declare class Systemctl {
    exec(action: string, service: string): Promise<string>;
}
export declare class MySQL {
    systemctl: Systemctl;
    constructor();
    status: () => Promise<string>;
    start: () => Promise<string>;
    restart: () => Promise<string>;
}
export declare class Apt {
    command: Command;
    list: () => Promise<string>;
    install: (pack: string) => Promise<string>;
    installs: (packs: string[]) => Promise<string>;
}
export declare class Which {
    command: Command;
    which: (cmd: string) => Promise<string>;
}
export declare class Bluetooth {
    systemctl: Systemctl;
    command: Command;
    constructor();
    status: () => Promise<string>;
    start: () => Promise<string>;
    restart: () => Promise<string>;
    hcistatus: () => Promise<string>;
    up: () => Promise<string>;
}
export declare class SSH {
    systemctl: Systemctl;
    constructor();
    stop: () => Promise<boolean>;
    disable: () => Promise<boolean>;
    start: () => Promise<boolean>;
    enable: () => Promise<boolean>;
    _executeCmd: (main: string) => Promise<boolean>;
}
export declare const exists: (file: string) => Promise<boolean>;
export declare const npm: () => Promise<string>;
export declare class Rebuild {
    exec(package_name: string, npm?: string): Promise<{
        output: string;
        code: number;
    }>;
}
export declare class DU {
    exec(path: string, depth: number): Promise<string>;
}
export declare class Cat {
    exec(filepath: string): Promise<string>;
}
export declare class MysqlAdmin {
    exec(command: string, user: string, password: string): Promise<string>;
}
