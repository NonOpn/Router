"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https = require('https');
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
            this._post("error", output, 5);
        };
        this.data = (data) => this._post("data", data);
        this.identity = (data, tags = []) => {
            identity && data && (data.identity = identity);
            tags.push(identity); //set at least the identity in a tag
            this._post(tags.join(","), data);
        };
    }
    _request(tag, json) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(json || {});
            const options = {
                hostname: "logs-01.loggly.com",
                port: 443,
                path: `/inputs/a1d1f44d-a2ea-4245-9659-ba7d9b6eb4f1/tag/${tag}/`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": data.length
                },
                timeout: 60000
            };
            const req = https.request(options, (res) => {
                res.on('data', (d) => { });
                res.on('end', () => resolve && resolve(true));
            });
            req.on('error', (error) => {
                reject && reject(error);
                reject = () => { };
                resolve = () => { };
            });
            req.write(data);
            req.end();
        });
    }
    _post(tag, data, retry) {
        const json = {};
        data && Object.keys(data).forEach(d => json[d] = data[d]);
        json.version = config_1.default.version;
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
        this._request(tag, json)
            .then(() => { })
            .catch((e) => {
            if (retry && retry > 0) {
                setTimeout(() => this._post(tag, data, retry - 1), 2 * 60 * 1000);
            }
            console.log(e);
        });
    }
}
exports._Logger = _Logger;
exports.Logger = new _Logger;
//# sourceMappingURL=index.js.map