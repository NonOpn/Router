declare class Systemctl {
    exec(action: string, service: string): Promise<string>;
    _launch(resolve: any, reject: any, ssh: any): void;
}
export declare class MySQL {
    systemctl: Systemctl;
    constructor();
    status: () => Promise<string>;
    start: () => Promise<string>;
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
export {};
