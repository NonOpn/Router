import { Resolve, Reject } from "../promise.jsx";
import { MySQL, MysqlAdmin } from "../systemctl";
export default class Pool {
    static instance: Pool;
    pool: any;
    mysql: MySQL;
    mysqladmin: MysqlAdmin;
    constructor();
    query(query: string, resolve_if_fail?: boolean): Promise<any[]>;
    queryParameters(query: string, parameters: any[], resolve_if_fail?: boolean): Promise<any[]>;
    repair(request: string, error: any, reject: Reject): void;
    manageErrorCrash(table_name: string, error: any, reject: Reject): void;
    _exec(query: string, parameters: any[], resolve: Resolve, reject: Reject, resolve_if_fail: boolean): void;
}
