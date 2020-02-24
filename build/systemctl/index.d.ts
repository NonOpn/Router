export declare class Systemctl {
    exec(action: string, service: string): Promise<string>;
    _launch(resolve: any, reject: any, ssh: any): void;
}
export declare class MySQL {
    systemctl: Systemctl;
    constructor();
    status: () => Promise<string>;
    start: () => Promise<string>;
    restart: () => Promise<string>;
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
export declare class DU {
    exec(path: string, depth: number): Promise<string>;
}
export declare class Cat {
    exec(filepath: string): Promise<string>;
}
export declare class MysqlAdmin {
    exec(command: string, user: string, password: string): Promise<string>;
}
