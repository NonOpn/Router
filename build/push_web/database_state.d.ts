export interface DiskState {
    size: number;
    free: number;
    used: number;
    percent: number;
}
export interface DatabaseState {
    disk?: DiskState;
    frames?: number;
    unsent?: number;
    size?: number;
    updated_at?: number;
}
export default class DatabaseStateProvider {
    static instance: DatabaseStateProvider;
    private state;
    private lastRefresh;
    private refreshing;
    current(): Promise<DatabaseState>;
    private refresh;
    private rootDisk;
    private number;
}
export declare function parseRootDisk(output: string): DiskState | undefined;
