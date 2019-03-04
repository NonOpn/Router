import { Resolve, Reject } from "../promise.jsx";
export default class Pool {
    static instance: Pool;
    pool: any;
    constructor();
    query(query: string, resolve_if_fail?: boolean): Promise<any[]>;
    queryParameters(query: string, parameters: any[], resolve_if_fail?: boolean): Promise<any[]>;
    manageErrorCrash(table_name: string, error: any, reject: Reject): void;
    _exec(query: string, parameters: any[], resolve: Resolve, reject: Reject, resolve_if_fail: boolean): void;
}
