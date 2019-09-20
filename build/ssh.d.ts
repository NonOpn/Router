export default class SSH {
    constructor();
    stop(): Promise<boolean>;
    disable(): Promise<boolean>;
    start(): Promise<boolean>;
    enable(): Promise<boolean>;
    _executeCmd(main: string): Promise<boolean>;
    _launch(resolve: any, reject: any, ssh: any): void;
}
