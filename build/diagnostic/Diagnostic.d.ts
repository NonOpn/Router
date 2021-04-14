declare class Diagnostic {
    private _started;
    start(): void;
    private onManage;
    send(diagnostic: any): Promise<void>;
    fetch(): Promise<any>;
}
declare const _default: Diagnostic;
export default _default;
