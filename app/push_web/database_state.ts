import { exec } from "child_process";
import Pool from "./pool";

export interface DiskState {
  size: number; // bytes
  free: number; // bytes available
  used: number; // bytes
  percent: number; // 0 - 100, used / (used + free) like df
}

export interface DatabaseState {
  disk?: DiskState; // the root filesystem
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

    state.disk = await this.rootDisk();

    // resolve_if_fail : those reports must not trigger the repair logic
    state.frames = await this.number("SELECT COUNT(*) as value FROM Frames");
    state.unsent = await this.number("SELECT COUNT(*) as value FROM Frames WHERE sent = 0");
    state.size = await this.number("SELECT SUM(data_length + index_length) as value FROM information_schema.TABLES WHERE table_schema = DATABASE()");

    this.state = state;
  }

  // df -kP : 1K blocks of the root filesystem only, fd-diskspace sums every filesystem in KiB
  private rootDisk(): Promise<DiskState|undefined> {
    return new Promise(resolve => {
      try {
        exec("df -kP /", { timeout: REFRESH_TIMEOUT }, (err: any, stdout: any) => {
          if(err || !stdout) return resolve(undefined);
          resolve(parseRootDisk(`${stdout}`));
        });
      } catch(e) {
        resolve(undefined);
      }
    });
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

// Filesystem 1024-blocks Used Available Capacity Mounted on
// /dev/root    6463816 2712780   3751036      42% /
export function parseRootDisk(output: string): DiskState|undefined {
  const lines = output.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  if(lines.length < 2) return undefined;

  const columns = lines[lines.length - 1].split(/\s+/);
  if(columns.length < 6) return undefined;

  const size = parseInt(columns[1], 10) * 1024;
  const used = parseInt(columns[2], 10) * 1024;
  const free = parseInt(columns[3], 10) * 1024;
  if(isNaN(size) || isNaN(used) || isNaN(free) || size <= 0) return undefined;

  // like the Capacity of df : the blocks reserved to root are not available
  const usable = used + free;
  const percent = usable > 0 ? Math.round(used / usable * 10000) / 100 : 0;
  return { size, free, used, percent };
}
