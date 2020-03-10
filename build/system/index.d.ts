export interface Space {
    free: number;
    size: number;
    used: number;
    percent: number;
}
export declare class Command {
    exec(exe: string, args?: string[]): Promise<string>;
    _launch(resolve: any, reject: any, cmd: any): void;
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
}
export declare class Diskspace {
    private du;
    static instance: Diskspace;
    constructor();
    diskspace(): Promise<Space>;
    usage(): Promise<string>;
}
