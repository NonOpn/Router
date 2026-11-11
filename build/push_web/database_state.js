"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRootDisk = parseRootDisk;
const child_process_1 = require("child_process");
const pool_1 = __importDefault(require("./pool"));
// counts on the Pi are not free, the pings only send the last known state
const REFRESH_INTERVAL = 15 * 60 * 1000;
const REFRESH_TIMEOUT = 5000;
class DatabaseStateProvider {
    constructor() {
        this.state = {};
        this.lastRefresh = 0;
    }
    current() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.refreshing && Date.now() - this.lastRefresh >= REFRESH_INTERVAL) {
                this.refreshing = this.refresh().catch(() => { }).then(() => { this.refreshing = undefined; });
            }
            // the echo and the ping ask at the same time at startup : both wait for the same refresh,
            // never holding them for too long, the next ones will get the values
            const refreshing = this.refreshing;
            if (refreshing) {
                yield Promise.race([refreshing, new Promise(resolve => setTimeout(resolve, REFRESH_TIMEOUT))]);
            }
            return this.state;
        });
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            this.lastRefresh = Date.now();
            const state = { updated_at: Math.floor(Date.now() / 1000) };
            state.disk = yield this.rootDisk();
            // resolve_if_fail : those reports must not trigger the repair logic
            state.frames = yield this.number("SELECT COUNT(*) as value FROM Frames");
            state.unsent = yield this.number("SELECT COUNT(*) as value FROM Frames WHERE sent = 0");
            state.size = yield this.number("SELECT SUM(data_length + index_length) as value FROM information_schema.TABLES WHERE table_schema = DATABASE()");
            this.state = state;
        });
    }
    // df -kP : 1K blocks of the root filesystem only, fd-diskspace sums every filesystem in KiB
    rootDisk() {
        return new Promise(resolve => {
            try {
                (0, child_process_1.exec)("df -kP /", { timeout: REFRESH_TIMEOUT }, (err, stdout) => {
                    if (err || !stdout)
                        return resolve(undefined);
                    resolve(parseRootDisk(`${stdout}`));
                });
            }
            catch (e) {
                resolve(undefined);
            }
        });
    }
    number(query) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const results = yield pool_1.default.instance.query(query, true);
                if (results && results.length > 0 && null != results[0].value)
                    return Number(results[0].value);
            }
            catch (e) {
            }
            return undefined;
        });
    }
}
DatabaseStateProvider.instance = new DatabaseStateProvider();
exports.default = DatabaseStateProvider;
// Filesystem 1024-blocks Used Available Capacity Mounted on
// /dev/root    6463816 2712780   3751036      42% /
function parseRootDisk(output) {
    const lines = output.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2)
        return undefined;
    const columns = lines[lines.length - 1].split(/\s+/);
    if (columns.length < 6)
        return undefined;
    const size = parseInt(columns[1], 10) * 1024;
    const used = parseInt(columns[2], 10) * 1024;
    const free = parseInt(columns[3], 10) * 1024;
    if (isNaN(size) || isNaN(used) || isNaN(free) || size <= 0)
        return undefined;
    // like the Capacity of df : the blocks reserved to root are not available
    const usable = used + free;
    const percent = usable > 0 ? Math.round(used / usable * 10000) / 100 : 0;
    return { size, free, used, percent };
}
//# sourceMappingURL=database_state.js.map