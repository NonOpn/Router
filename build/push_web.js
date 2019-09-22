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
const push_web_1 = __importDefault(require("./config/push_web"));
const frame_model_compress_js_1 = __importDefault(require("./push_web/frame_model_compress.js"));
const index_js_1 = require("./log/index.js");
const errors = errors_1.default.instance;
const VERSION = 8;
function _post(json) {
    console.log("posting json");
    return new Promise((resolve, reject) => {
        try {
            request_1.default.post({
                url: "https://contact-platform.com/api/ping",
                json: json
            }, (e, response, body) => {
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
function createRequest(data /*buffer hex */) {
    const base64 = data.toString("base64");
    return { host: config_js_1.default.identity, version: VERSION, data: base64 };
}
class PushWEB extends events_1.EventEmitter {
    constructor() {
        super();
        this.is_activated = push_web_1.default.is_activated;
        this._posting = false;
    }
    trySend() {
        if (this._posting || !this.is_activated)
            return;
        this._posting = true;
        console.log("try send to send frames");
        frame_model_1.default.instance.getUnsent()
            .then((frames) => {
            console.log("frames ? " + frames);
            const callback = (i) => {
                console.log("callback called with " + i);
                if (null == frames || i >= frames.length) {
                    _post({
                        host: config_js_1.default.identity,
                        version: VERSION,
                        fnished: true
                    })
                        .then(body => {
                        console.log("finished");
                        this._posting = false;
                    })
                        .catch(err => {
                        console.log("finished with network err");
                        this._posting = false;
                        errors.postJsonError(err);
                    });
                }
                else {
                    const frame = frames[i];
                    //const hex = Buffer.from(frame.frame, "hex");
                    const json = createRequestRaw(frame.frame); //createRequest(hex);
                    json.remaining = frames.length - i;
                    json.id = frame.id;
                    _post(json)
                        .then(body => {
                        return frame_model_1.default.instance.setSent(frame.id || 0, true);
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
            };
            callback(0);
        })
            .catch(err => {
            console.log("frames error... ");
            index_js_1.Logger.error(err);
            errors.postJsonError(err);
            this._posting = false;
        });
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
    onFrame(data) {
        if ( /*this.is_activated && */data && data.sender) {
            this.applyData(data);
        }
    }
    connect() {
        if (!this.is_activated) {
            console.log("PushWEB is disabled see .env.example");
            this.sendEcho();
            setInterval(() => {
                this.sendEcho();
            }, 15 * 60 * 1000); //set echo every 15minutes
        }
        else {
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
    applyData(data) {
        //if(!this.is_activated) return;
        var rawData = undefined;
        if (data && data.rawFrameStr) {
            if (data.rawFrameStr.length === 60) { //30*2
                rawData = data.rawFrameStr; //compress30(data.rawFrameStr);
            }
            else if (data.rawFrameStr.length === 48) { //24*2
                rawData = data.rawFrameStr; //compress24(data.rawFrameStr);
            }
        }
        if (rawData) {
            const to_save = frame_model_1.default.instance.from(rawData);
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
}
exports.default = PushWEB;
//# sourceMappingURL=push_web.js.map