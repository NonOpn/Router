"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = __importDefault(require("request"));
const config_js_1 = __importDefault(require("./config/config.js"));
const index_js_1 = require("./log/index.js");
var CTORS = [
    { error: TypeError, name: 'TypeError' },
    { error: SyntaxError, name: 'SyntaxError' },
    { error: ReferenceError, name: 'ReferenceError' },
    { error: RangeError, name: 'RangeError' },
    { error: URIError, name: 'URIError' },
    { error: EvalError, name: 'EvalError' },
    { error: Error, name: 'Error' }
];
function typeName(error) {
    var name = "UnknownError";
    CTORS.forEach(err => {
        if (error instanceof err.error)
            name = err.name;
    });
    return name;
}
function toJSON(err) {
    var keys, out, i;
    out = {};
    out.type = typeName(err);
    out.message = err.message;
    if (err.name)
        out.name = err.name;
    if (err.stack)
        out.stack = err.stack;
    if (err.code)
        out.code = err.code;
    if (err.errno)
        out.errno = err.errno;
    if (err.syscall)
        out.syscall = err.syscall;
    if (config_js_1.default) {
        out.config = {
            identity: config_js_1.default.identity,
            version: config_js_1.default.version
        };
    }
    keys = Object.keys(err);
    keys.forEach(key => (out[key] = err[key]));
    return out;
}
class Errors {
    postJsonError(err, reason = undefined) {
        index_js_1.Logger.error(toJSON(err), reason);
        this.postJsonErrorPromise(err)
            .then(val => console.log("val posted"))
            .catch(err => console.log("err obtained"));
    }
    postJsonErrorPromise(err, reason = undefined) {
        index_js_1.Logger.error(toJSON(err), reason);
        return new Promise((resolve, reject) => {
            if (err) {
                request_1.default.post({
                    url: "https://contact-platform.com/api/ping",
                    json: {
                        error: toJSON(err),
                        version: "999"
                    }
                }, (e, response, body) => {
                    var code = response ? response.statusCode : 200;
                    if (e || code < 200 || code > 299) {
                        console.log("store error");
                    }
                    else {
                        console.log("error manager");
                    }
                    resolve(err);
                });
            }
            else {
                resolve(err);
            }
        });
    }
}
Errors.instance = new Errors();
exports.default = Errors;
//# sourceMappingURL=errors.js.map