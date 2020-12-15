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
const VERSION = 12;
function _post(json) {
    console.log("posting json");
    return new Promise((resolve, reject) => {
        const gprs = index_1.default.instance.isGPRS();
        console.log("gprs mode ?", gprs);
        var url = "https://contact-platform.com/api/ping";
        if (gprs) {
            url = "http://contact-platform.com/api/ping";
        }
        try {
            request_1.default.post({ url, json, gzip: "true" }, (e, response, body) => {
                console.log("answer obtained ", e);
                if (e) {
                    reject(e);
                }
                else if (response && response.statusCode) {
                    resolve(body);
                }
                else {
                    reject(e);
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
        this.is_activated = true;
        this._number_to_skip = 0;
        this.trySendOk = () => __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._posting || !this.is_activated) {
                    log_1.Logger.data({ context: "push_web", posting: this._posting, is_activated: this.is_activated });
                    return;
                }
                console.log("try send to send frames");
                if (!index_1.default.instance.isGPRS())
                    log_1.Logger.data({ context: "push_web", infos: "entering" });
                //TODO for GPRS, when getting unsent, only get the last non alert + every alerts in the steps
                const frames = yield frame_model_1.default.instance.getUnsent();
                this._posting = true;
                console.log("frames ? " + frames);
                if (!index_1.default.instance.isGPRS())
                    log_1.Logger.data({ context: "push_web", infos: "obtained", size: frames.length });
                if (null == frames || frames.length == 0) {
                    console.log("finished");
                    this._posting = false;
                }
                else {
                    var i = 0;
                    while (i < frames.length) {
                        const to_frames = [];
                        const json = createRequestRaw("");
                        while (to_frames.length < 240 && i < frames.length) {
                            to_frames.push({ data: createRequestRaw(frames[i].frame).data, id: frames[i].id });
                            i++;
                        }
                        if (frames.length > 0) {
                            json.id = frames[frames.length - 1].id || -1;
                        }
                        json.data = to_frames.map(frame => frame.data).join(",");
                        json.remaining = frames.length - i;
                        json.gprs = !!index_1.default.instance.isGPRS();
                        yield _post(json);
                        var j = 0;
                        while (j < to_frames.length) {
                            const frame = to_frames[j];
                            yield frame_model_1.default.instance.setSent(frame.id || 0, true);
                            j++;
                        }
                        if (!index_1.default.instance.isGPRS())
                            log_1.Logger.data({ context: "push_web", infos: "done", size: to_frames.length });
                    }
                }
            }
            catch (e) {
                errors.postJsonError(e);
                console.log("frames error... ");
                log_1.Logger.error(e, "in push_web");
                log_1.Logger.data({ context: "push_web", posting: this._posting, is_activated: this.is_activated, error: e });
            }
            this._posting = false;
        });
        this._started = false;
        //this.is_activated = push_web_config.is_activated;
        this._posting = false;
    }
    trySend() {
        if (index_1.default.instance.isGPRS() && this._number_to_skip > 0) {
            this._number_to_skip--;
            if (this._number_to_skip < 0)
                this._number_to_skip = 0;
            return;
        }
        this._number_to_skip = 4;
        this.trySendOk().then(() => { }).catch(err => { });
    }
    sendEcho() {
        new Promise((resolve, reject) => {
            request_1.default.post({
                url: "https://contact-platform.com/api/echo",
                json: { host: config_1.default.identity, version: VERSION }
            }, (e, response, body) => {
                //nothing to do
                console.log(body);
                resolve(true);
            });
        })
            .then(result => {
            console.log("echo posted");
        })
            .catch(err => {
            console.log("echo error", err);
            errors.postJsonError(err);
        });
    }
    onFrame(device, data) {
        this.applyData(device, data);
    }
    connect() {
        if (this._started)
            return;
        if (!this.is_activated) {
            this._started = true;
            console.log("PushWEB is disabled see .env.example");
            this.sendEcho();
            setInterval(() => {
                this.sendEcho();
            }, 15 * 60 * 1000); //set echo every 15minutes
        }
        else {
            this._started = true;
            console.log("PushWEB is now init");
            this.sendEcho();
            setInterval(() => {
                this.sendEcho();
            }, 15 * 60 * 1000); //set echo every 15minutes
            this.trySend();
            setInterval(() => {
                console.log("try send... " + this.is_activated + " " + this._posting);
                this.trySend();
            }, 1 * 60 * 1000); //every 60s
        }
    }
    applyData(device, data) {
        const _data = data ? data : {};
        var rawdata = _data.rawByte || _data.rawFrameStr;
        if (rawdata && rawdata.length != 48 && rawdata.length != 60) {
            return;
        }
        const to_save = frame_model_1.default.instance.from(rawdata);
        to_save.product_id = device ? device.getId() : undefined;
        Promise.all([
            frame_model_1.default.instance.save(to_save),
            frame_model_compress_1.default.instance.save(to_save)
        ])
            .then(saved => console.log(saved))
            .catch(err => {
            errors.postJsonError(err);
            console.log(err);
        });
    }
}
exports.default = PushWEB;
//# sourceMappingURL=push_web.js.map