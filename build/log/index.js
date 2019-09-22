"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = __importDefault(require("request"));
const config_1 = __importDefault(require("../config/config"));
const identity = config_1.default.identity || "unknown";
class _Logger {
    constructor() {
        this.error = (error, reason = undefined) => {
            reason && (error.reason = reason);
            this._post("error", error);
        };
        this.data = (data) => this._post("data", data);
        this.identity = (data) => {
            identity && data && (data.identity = identity);
            this._post(identity, data);
        };
    }
    _post(tag, data) {
        const json = {};
        data && Object.keys(data).forEach(d => json[d] = data[d]);
        data.host = config_1.default.identity;
        request_1.default.post({
            url: "http://logs-01.loggly.com/inputs/d7f59ce0-0912-4f5d-82f0-004a9a8045e0/tag/" + tag + "/",
            json: json
        }, (e, response, body) => {
            //nothing to do
            console.log(body);
        });
    }
}
exports.Logger = new _Logger;
//# sourceMappingURL=index.js.map