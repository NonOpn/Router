"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const config_js_1 = __importDefault(require("./config/config.js"));
const errors_1 = __importDefault(require("./errors"));
const request_1 = __importDefault(require("request"));
const frame_model_1 = __importDefault(require("./push_web/frame_model"));
const frame_model_compress_js_1 = __importDefault(require("./push_web/frame_model_compress.js"));
const index_js_1 = __importDefault(require("./network/index.js"));
const errors = errors_1.default.instance;
const VERSION = 11;
function _post(json) {
    console.log("posting json");
    return new Promise((resolve, reject) => {
        const gprs = index_js_1.default.instance.isGPRS();
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
        host: config_js_1.default.identity,
        version: VERSION,
        data: raw
    };
}
class PushWEB extends events_1.EventEmitter {
    constructor() {
        super();
        this.is_activated = true;
        this._number_to_skip = 0;
        this._started = false;
        //this.is_activated = push_web_config.is_activated;
        this._posting = false;
    }
    trySend() {
        if (index_js_1.default.instance.isGPRS() && this._number_to_skip > 0) {
            this._number_to_skip--;
            if (this._number_to_skip < 0)
                this._number_to_skip = 0;
            return;
        }
        this._number_to_skip = 4;
        this.trySendOk();
    }
    trySendOk() {
        try {
            if (this._posting || !this.is_activated)
                return;
            this._posting = true;
            console.log("try send to send frames");
            //TODO for GPRS, when getting unsent, only get the last non alert + every alerts in the steps
            frame_model_1.default.instance.getUnsent()
                .then((frames) => {
                console.log("frames ? " + frames);
                const callback = (i) => {
                    try {
                        console.log("callback called with " + i);
                        if (null == frames || i >= frames.length) {
                            console.log("finished");
                            this._posting = false;
                        }
                        else {
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
                            //const frame = frames[i];
                            //const json = createRequestRaw(frame.frame); //createRequest(hex);
                            json.remaining = frames.length - i;
                            json.gprs = !!index_js_1.default.instance.isGPRS();
                            _post(json)
                                .then(body => {
                                return Promise.all(to_frames.map(frame => frame_model_1.default.instance.setSent(frame.id || 0, true)));
                            })
                                .then(saved => {
                                callback(i + 1);
                            })
                                .catch(err => {
                                console.log(err);
                                errors.postJsonError(err);
                                callback(i + 1);
                            });
                        }
                    }
                    catch (e) {
                        errors.postJsonError(e);
                        //once the issue has been found, this can be enforced
                        //this._posting = false;
                    }
                };
                callback(0);
            })
                .catch(err => {
                console.log("frames error... ");
                //Logger.error(err, "in push_web");
                //errors.postJsonError(err);
                this._posting = false;
            });
        }
        catch (e) {
            this._posting = false;
        }
    }
    sendEcho() {
        new Promise((resolve, reject) => {
            request_1.default.post({
                url: "https://contact-platform.com/api/echo",
                json: { host: config_js_1.default.identity, version: VERSION }
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
            frame_model_compress_js_1.default.instance.save(to_save)
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