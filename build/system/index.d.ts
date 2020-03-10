export interface Space {
    free: number;
    size: number;
    used: number;
    percent: number;
}
export declare class SystemInfo {
    private command;
    static instance: SystemInfo;
    uname: () => Promise<string>;
    uptime: () => Promise<string>;
    arch: () => Promise<string>;
    release: () => Promise<string>;
    version: () => Promise<string>;
    platform: () => Promise<string>;
    cpuinfo: () => Promise<string>;
    isv6l(): Promise<boolean>;
    canBeRepaired(): Promise<boolean>;
}
export declare class Diskspace {
    private du;
    static instance: Diskspace;
    constructor();
    diskspace(): Promise<Space>;
    usage(): Promise<string>;
}
