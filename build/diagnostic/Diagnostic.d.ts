declare class Diagnostic {
    private _started;
    private diagnostics;
    private log;
    start(): void;
    private onManage;
    private send;
    private wait;
    private sendRetry;
    onConfiguration(diagnostic: any): void;
}
declare const _default: Diagnostic;
export default _default;
