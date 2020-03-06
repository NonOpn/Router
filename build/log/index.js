"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = __importDefault(require("request"));
const config_1 = __importDefault(require("../config/config"));
const os_1 = __importDefault(require("os"));
const identity = config_1.default.identity || "unknown";
class _Logger {
    constructor() {
        this.error = (error, reason = undefined) => {
            const output = { str: "", stack: null, message: "", code: 0, process: {
                    platform: "",
                    version: ""
                }, reason: "" };
            try {
                if (error) {
                    Object.keys(error).map(k => output[k] = error[k]);
                    output.stack = error.stack;
                    output.str = error.toString();
                    output.message = error.message;
                    output.code = error.code;
                }
            }
            catch (e) {
            }
            reason && (output.reason = reason);
            this._post("error", output);
        };
        this.data = (data) => this._post("data", data);
        this.identity = (data, tags = []) => {
            identity && data && (data.identity = identity);
            tags.push(identity); //set at least the identity in a tag
            this._post(tags.join(","), data);
        };
    }
    _post(tag, data) {
        const json = {};
        data && Object.keys(data).forEach(d => json[d] = data[d]);
        json.version = "1.0";
        data.host = config_1.default.identity;
        try {
            json.process = {
                os: {
                    arch: os_1.default.arch(),
                    platform: os_1.default.platform(),
                    release: os_1.default.release(),
                    type: os_1.default.type(),
                    uptime: os_1.default.uptime()
                },
                platform: process.platform,
                version: process.version
            };
        }
        catch (e) {
        }
        request_1.default.post({
            url: "http://logs-01.loggly.com/inputs/a1d1f44d-a2ea-4245-9659-ba7d9b6eb4f1/tag/" + tag + "/",
            json: json
        }, (e, response, body) => {
            //nothing to do
        });
    }
}
exports._Logger = _Logger;
exports.Logger = new _Logger;
//# sourceMappingURL=index.js.map