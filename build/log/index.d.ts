export declare class _Logger {
    post(hostname: string, port: number, path: string, headers: any, json: any): Promise<unknown>;
    private _request;
    private _post;
    error: (error: any, reason?: string | undefined) => void;
    data(data: any): Promise<void>;
}
export declare const Logger: _Logger;
