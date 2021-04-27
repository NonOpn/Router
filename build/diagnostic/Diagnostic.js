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
const systemctl_1 = require("../systemctl");
const log_1 = require("../log");
class Diagnostic {
    constructor() {
        this._started = false;
        this.diagnostics = [];
        this.onTick = () => __awaiter(this, void 0, void 0, function* () {
            const diagnostic = yield this.fetch();
            if (!!diagnostic)
                this.diagnostics.push(diagnostic);
            this.log("onTick", diagnostic.length);
        });
        this.onManage = () => __awaiter(this, void 0, void 0, function* () {
            const diagnostics = [...this.diagnostics];
            this.diagnostics = [];
            yield this.send(diagnostics);
        });
    }
    log(arg1, arg2) {
        if (arguments.length == 1)
            console.warn("Diagnosstic :: " + arg1);
        else
            console.warn("Diagnosstic :: " + arg1, arg2);
    }
    start() {
        if (this._started)
            return;
        this._started = true;
        new systemctl_1.Bash().exec("/usr/local/routair/scripts/configure_i2c.sh")
            .then(result => this.log("Bash", result)).catch(err => this.log("Bash, error", err));
        setInterval(() => this.onTick().catch(err => this.log("onTick", err)), 60 * 1000);
        setInterval(() => this.onManage().catch(err => this.log("onManage", err)), 60 * 60 * 1000);
    }
    send(diagnostics) {
        return new Promise((resolve, reject) => {
            log_1.Logger.data({ diagnostics });
            request_1.default.post({
                url: "https://api.contact-platform.com/v3/routair/data",
                json: {
                    routair: config_1.default.identity,
                    diagnostics
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
                            resolve(body);
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