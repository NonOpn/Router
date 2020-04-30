export declare class _Logger {
    _request(tag: string, json: any): Promise<{}>;
    _post(tag: string, data: any): void;
    error: (error: any, reason?: string | undefined) => void;
    data: (data: any) => void;
    identity: (data: any, tags?: string[]) => void;
}
export declare const Logger: _Logger;
