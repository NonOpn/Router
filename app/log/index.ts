import request from "request";
import config from "../config/config";
import os from "os";

const identity = config.identity ||  "unknown";

export class _Logger {
    _post(tag: string, data: any) {
        const json: any = {};
        data && Object.keys(data).forEach(d => json[d] = data[d]);
        json.version = "1.0";
        data.host = config.identity;

        try {
            json.process = {
                os: {
                    arch: os.arch(),
                    platform: os.platform(),
                    release: os.release(),
                    type: os.type(),
                    uptime: os.uptime()
                },
                platform: process.platform,
                version: process.version
            };
        }catch(e) {

        }

        request.post({
            url: "http://logs-01.loggly.com/inputs/a1d1f44d-a2ea-4245-9659-ba7d9b6eb4f1/tag/"+tag+"/",
            json: json
        }, (e: any, response: any, body: any) => {
            //nothing to do
        });
    }

    error = (error: any, reason: string|undefined = undefined) => {
        const output = {str: "", stack: null, message:"", code:0, process:{
            platform:"",
            version: ""
        }, reason:""};
        try {
            if(error) {
                Object.keys(error).map(k => output[k] = error[k]);
                output.stack = error.stack;
                output.str = error.toString();
                output.message = error.message;
                output.code = error.code;
            }
        }catch(e) {

        }
        reason && (output.reason = reason);
        this._post("error", output);
    }

    data = (data: any) => this._post("data", data);
    identity = (data: any, tags:string[] = []) => {
        identity && data && (data.identity = identity);

        tags.push(identity); //set at least the identity in a tag
        this._post(tags.join(","), data);
    }
}

export const Logger = new _Logger;