declare class Diagnostic {
    private _started;
    private diagnostics;
    private log;
    start(): void;
    private onTick;
    private onManage;
    private send;
    private wait;
    private sendRetry;
    private fetch;
}
declare const _default: Diagnostic;
export default _default;
