export default class SSH {
    constructor();
    stop(): Promise<boolean>;
    disable(): Promise<boolean>;
    _launch(resolve: any, reject: any, ssh: any): void;
}
