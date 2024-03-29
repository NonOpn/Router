import { Resolve, Reject } from "../promise.jsx";
import { MySQL, MysqlAdmin } from "../systemctl";
export default class Pool {
    static instance: Pool;
    pool: any;
    mysql: MySQL;
    mysqladmin: MysqlAdmin;
    sent_mysql_status: number;
    constructor();
    trySendMysqlStatus(): Promise<boolean>;
    query(query: string, resolve_if_fail?: boolean): Promise<any[]>;
    queryParameters(query: string, parameters: any[], resolve_if_fail?: boolean): Promise<any[]>;
    forceWideRepair: () => Promise<void>;
    repair(request: string, error: any, reject: Reject): void;
    log(data: any): void;
    private needsRepair;
    manageErrorCrash(table_name: string, error: any, reject: Reject, callback?: () => Promise<any>): void;
    private can_post_error;
    private tryPostingSQLState;
    _exec(query: string, parameters: any[], resolve: Resolve, reject: Reject, resolve_if_fail: boolean): void;
}
