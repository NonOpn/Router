declare class _Logger {
    _post(tag: string, data: any): void;
    error: (error: any, reason?: string | undefined) => void;
    data: (data: any) => void;
    identity: (data: any) => void;
}
export declare const Logger: _Logger;
export {};
