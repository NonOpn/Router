export interface MySQLConfig {
    host: string | undefined | null;
    user: string | undefined | null;
    password: string | undefined | null;
    database: string | undefined | null;
}
declare const config: MySQLConfig;
export default config;
