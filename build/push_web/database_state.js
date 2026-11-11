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
const pool_1 = __importDefault(require("./pool"));
const system_1 = require("../system");
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
            if (Date.now() - this.lastRefresh >= REFRESH_INTERVAL) {
                if (!this.refreshing) {
                    this.refreshing = this.refresh().catch(() => { }).then(() => { this.refreshing = undefined; });
                }
                // never hold the ping for too long, the next ones will get the values
                yield Promise.race([this.refreshing, new Promise(resolve => setTimeout(resolve, REFRESH_TIMEOUT))]);
            }
            return this.state;
        });
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            this.lastRefresh = Date.now();
            const state = { updated_at: Math.floor(Date.now() / 1000) };
            try {
                state.disk = yield system_1.Diskspace.instance.diskspace();
            }
            catch (e) {
            }
            // resolve_if_fail : those reports must not trigger the repair logic
            state.frames = yield this.number("SELECT COUNT(*) as value FROM Frames");
            state.unsent = yield this.number("SELECT COUNT(*) as value FROM Frames WHERE sent = 0");
            state.size = yield this.number("SELECT SUM(data_length + index_length) as value FROM information_schema.TABLES WHERE table_schema = DATABASE()");
            this.state = state;
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
//# sourceMappingURL=database_state.js.map