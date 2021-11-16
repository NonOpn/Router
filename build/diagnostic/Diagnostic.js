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
const network_1 = __importDefault(require("../network"));
class Diagnostic {
    constructor() {
        this._started = false;
        this.diagnostics = [];
        this.onManage = () => __awaiter(this, void 0, void 0, function* () {
            const diagnostics = [...this.diagnostics];
            this.diagnostics = [];
            yield this.send(diagnostics);
        });
        this.send = (diagnostics) => __awaiter(this, void 0, void 0, function* () {
            var i = 1;
            while (i < 6) {
                try {
                    yield this.sendRetry(diagnostics);
                    return;
                }
                catch (e) { }
                yield this.wait(i * 1000);
                i++;
            }
        });
        this.wait = (time) => __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                setTimeout(() => resolve(), time);
            });
        });
    }
    log(arg1, arg2) {
        return;
        //if(arguments.length == 1) console.warn("Diagnosstic :: " + arg1);
        //else console.warn("Diagnostic :: " + arg1, arg2);
    }
    start() {
        if (this._started)
            return;
        this._started = true;
        new systemctl_1.Bash().exec("/usr/local/routair/scripts/configure_i2c.sh")
            .then(result => this.log("Bash", result)).catch(err => this.log("Bash, error", err));
        setInterval(() => this.onManage().catch(err => this.log("onManage", err)), 60 * 60 * 1000);
    }
    sendRetry(diagnostics) {
        return new Promise((resolve, reject) => {
            log_1.Logger.data({ diagnostics });
            var scheme = network_1.default.instance.isGPRS() ? "http" : "https";
            request_1.default.post({
                url: `${scheme}://api.contact-platform.com/v3/routair/data`,
                json: {
                    routair: config_1.default.identity,
                    diagnostics
                }
            }, (e, response, body) => {
                resolve();
            });
        });
    }
    onConfiguration(diagnostic) {
        if (!this.diagnostics)
            this.diagnostics = [];
        this.diagnostics.push(diagnostic);
        console.log(`onConfiguration :: having ${this.diagnostics.length} diagnostic in queue`);
    }
}
exports.default = new Diagnostic();
//# sourceMappingURL=Diagnostic.js.map