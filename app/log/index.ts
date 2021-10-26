const https = require('https');
import config from "../config/config";
import os from "os";

const identity = config.identity ||  "unknown";

export class _Logger {

    post(hostname: string, port: number, path: string, headers: any, json: any) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(json || {});
            console.log("trying " + hostname);

            const options = {
                hostname,
                port,
                path,
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type": "application/json",
                    "Content-Length": data.length
                },
                rejectUnauthorized: false,
                timeout: 60000
            }

            const req = https.request(options, (res) => {
                var result = "";
                res.on('data', (d: Buffer) => {
                    result += d.toString();
                });

                res.on('end', () => resolve && resolve(result));
            })

            req.on('error', (error: Error) => {
                console.error("having error for " + hostname, error);
                reject && reject(error);
                reject = () =>  {};
                resolve = () =>  {};
            })

            req.write(data)
            req.end();
        });
    }

    private _request = async (tag: string,json: any) => {
        try {
            await this.post("api.contact-platform.com", 443, `/api/v4/routair/${tag}/`, {}, json);
        } catch(err2) {
            //posting data to contact platform
        }
        return this.post("logs-01.loggly.com", 443, `/inputs/a1d1f44d-a2ea-4245-9659-ba7d9b6eb4f1/tag/${tag}/`, {}, json);
    }

    private _post(tag: string, data: any, retry?: number) {
        if(!data) data = {};
        identity && (data.identity = identity);
        const json: any = {};
        Object.keys(data).forEach(d => json[d] = data[d]);
        json.version = config.version;
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

        this._request(tag, json)
        .then(() => {})
        .catch((e: Error) => {
            if(retry && retry > 0) {
                setTimeout(() => this._post(tag, data, retry - 1), 2 * 60 * 1000);
            }
            console.log(e);
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
        this._post("error", output, 5);
    }

    data = (data: any) => this._post("report", data);
}

export const Logger = new _Logger;