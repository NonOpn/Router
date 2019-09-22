import request from "request";
import config from "../config/config";

const identity = config.identity ||  "unknown";

class _Logger {
    _post(tag: string, data: any) {
        const json = {};
        data && Object.keys(data).forEach(d => json[d] = data[d]);
        data.host = config.identity;

        request.post({
            url: "http://logs-01.loggly.com/inputs/d7f59ce0-0912-4f5d-82f0-004a9a8045e0/tag/"+tag+"/",
            json: json
        }, (e: any, response: any, body: any) => {
            //nothing to do
            console.log(body);
        });
    }

    error = (error: any, reason: string|undefined = undefined) => {
        reason && (error.reason = reason);
        this._post("error", error);
    }

    data = (data: any) => this._post("data", data);
    identity = (data: any) => {
        identity && data && (data.identity = identity);
        this._post(identity, data);
    }
}

export const Logger = new _Logger;