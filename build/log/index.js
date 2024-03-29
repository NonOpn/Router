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
exports.Logger = exports._Logger = void 0;
const https = require('https');
const config_1 = __importDefault(require("../config/config"));
const os_1 = __importDefault(require("os"));
const network_1 = __importDefault(require("../network"));
const identity = config_1.default.identity || "unknown";
class _Logger {
    constructor() {
        this._request = (tag, json) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.post("api.contact-platform.com", 443, `/api/v4/routair/${tag}/`, {}, json);
            }
            catch (err2) {
                //posting data to contact platform
            }
            return this.post("logs-01.loggly.com", 443, `/inputs/a1d1f44d-a2ea-4245-9659-ba7d9b6eb4f1/tag/${tag}/`, {}, json);
        });
        this.error = (error, reason = undefined) => {
            if (network_1.default.instance.isGPRS())
                return;
            const output = { str: "", stack: null, message: "", code: 0, process: {
                    platform: "",
                    version: ""
                }, reason: "" };
            try {
                if (error) {
                    //@ts-ignore
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
    }
    post(hostname, port, path, headers, json) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(json || {});
            const options = {
                hostname,
                port,
                path,
                method: "POST",
                headers: Object.assign(Object.assign({}, headers), { "Content-Type": "application/json", "Content-Length": data.length }),
                rejectUnauthorized: false,
                timeout: 60000
            };
            const req = https.request(options, (res) => {
                var result = "";
                res.on('data', (d) => {
                    result += d.toString();
                });
                res.on('end', () => resolve && resolve(result));
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
        if (!data)
            data = {};
        identity && (data.identity = identity);
        const json = {};
        Object.keys(data).forEach(d => json[d] = data[d]);
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
    data(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (network_1.default.instance.isGPRS())
                return;
            yield this._post("report", data);
        });
    }
}
exports._Logger = _Logger;
exports.Logger = new _Logger;
//# sourceMappingURL=index.js.map