import Pool from "./pool";
import { Diskspace, Space } from "../system";

export interface DatabaseState {
  disk?: Space; // bytes of the root filesystem
  frames?: number; // frames stored locally
  unsent?: number; // frames not yet sent to the backend
  size?: number; // bytes (data + index) used by the database
  updated_at?: number;
}

// counts on the Pi are not free, the pings only send the last known state
const REFRESH_INTERVAL = 15 * 60 * 1000;
const REFRESH_TIMEOUT = 5000;

export default class DatabaseStateProvider {
  public static instance: DatabaseStateProvider = new DatabaseStateProvider();

  private state: DatabaseState = {};
  private lastRefresh = 0;
  private refreshing: Promise<void>|undefined;

  public async current(): Promise<DatabaseState> {
    if(Date.now() - this.lastRefresh >= REFRESH_INTERVAL) {
      if(!this.refreshing) {
        this.refreshing = this.refresh().catch(() => {}).then(() => { this.refreshing = undefined; });
      }
      // never hold the ping for too long, the next ones will get the values
      await Promise.race([this.refreshing, new Promise(resolve => setTimeout(resolve, REFRESH_TIMEOUT))]);
    }
    return this.state;
  }

  private async refresh() {
    this.lastRefresh = Date.now();
    const state: DatabaseState = { updated_at: Math.floor(Date.now() / 1000) };

    try {
      state.disk = await Diskspace.instance.diskspace();
    } catch(e) {

    }

    // resolve_if_fail : those reports must not trigger the repair logic
    state.frames = await this.number("SELECT COUNT(*) as value FROM Frames");
    state.unsent = await this.number("SELECT COUNT(*) as value FROM Frames WHERE sent = 0");
    state.size = await this.number("SELECT SUM(data_length + index_length) as value FROM information_schema.TABLES WHERE table_schema = DATABASE()");

    this.state = state;
  }

  private async number(query: string): Promise<number|undefined> {
    try {
      const results = await Pool.instance.query(query, true);
      if(results && results.length > 0 && null != results[0].value) return Number(results[0].value);
    } catch(e) {

    }
    return undefined;
  }
}
