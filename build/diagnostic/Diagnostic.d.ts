declare class Diagnostic {
    private _started;
    private diagnostics;
    private log;
    start(): void;
    private onTick;
    private onManage;
    send(diagnostics: any): Promise<void>;
    fetch(): Promise<any>;
}
declare const _default: Diagnostic;
export default _default;
