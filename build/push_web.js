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
const events_1 = require("events");
const config_1 = __importDefault(require("./config/config"));
const errors_1 = __importDefault(require("./errors"));
const request_1 = __importDefault(require("request"));
const frame_model_1 = __importDefault(require("./push_web/frame_model"));
const frame_model_compress_1 = __importDefault(require("./push_web/frame_model_compress"));
const index_1 = __importDefault(require("./network/index"));
const log_1 = require("./log");
const errors = errors_1.default.instance;
const VERSION = config_1.default.version;
function _post(json) {
    const gprs = index_1.default.instance.isGPRS();
    console.log("posting json");
    if (!gprs) {
        return log_1.Logger.post("contact-platform.com", 443, "/api/ping", {}, json);
    }
    //in gprs mode, simply sends the values
    return new Promise((resolve, reject) => {
        console.log("gprs mode ?", gprs);
        var url = "http://contact-platform.com/api/ping";
        try {
            request_1.default.post({ url, json, gzip: !!gprs }, (e, response, body) => {
                if (e) {
                    reject(e);
                }
                else {
                    resolve(body);
                }
            });
        }
        catch (err) {
            reject(err);
        }
    });
}
function createRequestRaw(raw) {
    return {
        host: config_1.default.identity,
        version: VERSION,
        data: raw
    };
}
class PushWEB extends events_1.EventEmitter {
    constructor() {
        super();
        this._number_to_skip = 0;
        this._protection_network = 0;
        this.memory_transactions = [];
        this.trySend = () => __awaiter(this, void 0, void 0, function* () {
            try {
                if (index_1.default.instance.isGPRS() && this._number_to_skip > 0) {
                    this._number_to_skip--;
                    if (this._number_to_skip < 0)
                        this._number_to_skip = 0;
                    return;
                }
                this._number_to_skip = 4;
                if (!!this._posting) {
                    this._protection_network++;
                    //if we have a timeout of 30min which did not clear the network stack... reset !
                    if (this._protection_network >= 3) {
                        this._protection_network = 0;
                        this._posting = false;
                    }
                    return;
                }
            }
            catch (e) {
                log_1.Logger.error(e, "in method trySend");
                return;
            }
            try {
                //send data over the network
                this._posting = true;
                yield this.trySendOk();
            }
            catch (e) {
                log_1.Logger.error(e, "error in trySendOk");
            }
            this._protection_network = 0;
            this._posting = false;
        });
        this.trySendOk = () => __awaiter(this, void 0, void 0, function* () {
            try {
                //TODO for GPRS, when getting unsent, only get the last non alert + every alerts in the steps
                var crashed = false;
                var frames = [];
                // safely prevent crashes
                try {
                    frames = yield frame_model_1.default.instance.getUnsent(120);
                }
                catch (e) {
                    crashed = true;
                    console.error("error while loading frames", e);
                }
                // this is a "last chance scenario", in this mode, we don't care about the frames before the last 120
                if (this.memory_transactions.length > 0) {
                    var last120 = [];
                    const length = this.memory_transactions.length;
                    if (length <= 120) {
                        last120 = this.memory_transactions;
                    }
                    else if (length > 120) {
                        //add the last 120 items
                        for (var i = 1; i <= 120; i++) {
                            last120.push(this.memory_transactions[length - i]);
                        }
                        //reverse
                        last120 = last120.reverse();
                    }
                    frames = [...frames, ...last120];
                }
                const json = createRequestRaw("");
                json.remaining = 0; //TODO get the info ?
                json.gprs = !!index_1.default.instance.isGPRS();
                json.crashed = crashed;
                if (null == frames || frames.length == 0) {
                    this.log({ infos: "push", none: true });
                    yield _post(json);
                }
                else {
                    const to_frames = frames.map(f => ({ data: createRequestRaw(f.frame).data, id: f.id }));
                    json.data = to_frames.map(frame => frame.data).join(",");
                    json.id = frames[frames.length - 1].id || -1;
                    var first_id = frames.length > 0 ? frames[0].id : 0;
                    const size = to_frames.length;
                    const supportFallback = !!(config_1.default.identity || "").toLocaleLowerCase().startsWith("0xfaa4205");
                    // we need support due to a device issue impacting the 0xfaa4205 rout@ir
                    if (supportFallback)
                        yield this.setSent(to_frames);
                    const result = yield _post(json);
                    this.log({ infos: "push", result, size, first_id });
                    //even for the above mentionned device, not an issue : setSent changes a flag
                    yield this.setSent(to_frames);
                }
            }
            catch (e) {
                this.log({ posting: this._posting, error: e });
                log_1.Logger.error(e, "in push_web");
                console.log("frames error... ");
            }
        });
        this.setSent = (frames) => __awaiter(this, void 0, void 0, function* () {
            var j = 0;
            while (j < frames.length) {
                const frame = frames[j];
                try {
                    yield frame_model_1.default.instance.setSent(frame.id || 0, true);
                }
                catch (e) {
                }
                j++;
            }
        });
        this.sendEcho = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const json = { host: config_1.default.identity, version: VERSION };
                const gprs = index_1.default.instance.isGPRS();
                if (!gprs) {
                    yield log_1.Logger.post("contact-platform.com", 443, "/api/echo", {}, json);
                }
                else {
                    yield new Promise((resolve, reject) => {
                        request_1.default.post({
                            url: "http://contact-platform.com/api/echo",
                            json
                        }, (e, response, body) => {
                            //nothing to do
                            console.log(body);
                            resolve(true);
                        });
                    });
                }
                console.log("echo posted");
            }
            catch (err) {
                console.log("echo error", err);
                errors.postJsonError(err);
            }
        });
        this.applyData = (device, data) => __awaiter(this, void 0, void 0, function* () {
            const _data = data ? data : {};
            var rawdata = _data.rawByte || _data.rawFrameStr;
            if (rawdata && rawdata.length != 48 && rawdata.length != 60) {
                return;
            }
            const to_save = frame_model_1.default.instance.from(rawdata);
            to_save.product_id = device ? device.getId() : undefined;
            try {
                yield frame_model_1.default.instance.save(to_save);
                yield frame_model_compress_1.default.instance.save(to_save);
            }
            catch (err) {
                errors.postJsonError(err);
                console.log(err);
                this.memory_transactions.push(to_save);
            }
        });
        this._posting = false;
    }
    log(data) {
        if (index_1.default.instance.isGPRS())
            return;
        log_1.Logger.data(Object.assign({ context: "push" }, data));
    }
    onFrame(device, data) {
        this.applyData(device, data).then(() => { }).catch(e => { });
    }
    connect() {
        console.log("PushWEB is now init");
        this.sendEcho();
        setInterval(() => {
            this.sendEcho();
        }, 15 * 60 * 1000); //set echo every 15minutes
        this.trySend();
        setInterval(() => {
            console.log("try send... " + this._posting);
            this.trySend();
        }, 1 * 60 * 1000); //every 60s
    }
}
exports.default = PushWEB;
//# sourceMappingURL=push_web.js.map