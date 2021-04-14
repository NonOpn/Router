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
const config_1 = __importDefault(require("../config/config"));
const request_1 = __importDefault(require("request"));
class Diagnostic {
    constructor() {
        this._started = false;
        this.onManage = () => __awaiter(this, void 0, void 0, function* () {
            const diagnostic = yield this.fetch();
            yield this.send(diagnostic);
        });
    }
    start() {
        if (this._started)
            return;
        this._started = true;
        setInterval(() => this.onManage().catch(err => console.warn(err)), 60 * 60 * 1000);
    }
    send(diagnostic) {
        console.warn("sending", {
            routair: config_1.default.identity,
            diagnostic
        });
        return new Promise((resolve, reject) => {
            request_1.default.post({
                url: "https://api.contact-platform.com/v3/routair/data",
                json: {
                    routair: config_1.default.identity,
                    diagnostic
                }
            }, (e, response, body) => {
                resolve();
            });
        });
    }
    fetch() {
        const url = "http://127.0.0.1:5000/report";
        //in gprs mode, simply sends the values
        return new Promise((resolve, reject) => {
            try {
                request_1.default.get({ url }, (e, response, body) => {
                    if (e) {
                        reject(e);
                    }
                    else {
                        try {
                            if (typeof body == "string")
                                body = JSON.parse(body);
                            var keys = Object.keys(body);
                            var count = 0, invalid = 0;
                            keys.forEach(key => {
                                var sub = Object.keys(body[key]);
                                sub.forEach(sub => {
                                    var value = parseInt(body[key][sub]);
                                    count++;
                                    if (isNaN(value) || value == -1)
                                        invalid++;
                                });
                            });
                            if (invalid > count * 0.8 || invalid > 7) {
                                reject(`too many invalid ${invalid}/${count}`);
                            }
                            else {
                                resolve(body);
                            }
                        }
                        catch (e) {
                            reject(e);
                        }
                    }
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }
}
exports.default = new Diagnostic();
//# sourceMappingURL=Diagnostic.js.map