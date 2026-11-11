import { Space } from "../system";
export interface DatabaseState {
    disk?: Space;
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
    private number;
}
