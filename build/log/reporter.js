"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const systemctl_1 = require("../systemctl");
const system_1 = __importDefault(require("../system"));
const _1 = require(".");
class Reporter {
    constructor() {
        this.started = false;
        this.mysql = new systemctl_1.MySQL();
    }
    start() {
        if (this.started)
            return;
        this.started = true;
        this._report();
        setInterval(() => this._report(), 15 * 60 * 1000);
    }
    _report() {
        system_1.default.instance.diskspace()
            .then(space => {
            if (space) {
                _1.Logger.identity(space, ["space"]);
            }
        })
            .catch(err => console.log(err));
        this.mysql.status()
            .then(status => {
            _1.Logger.identity({ mysql: status }, ["mysql", "service"]);
        })
            .catch(err => {
            console.error(err);
        });
    }
}
Reporter.instance = new Reporter();
exports.default = Reporter;
//# sourceMappingURL=reporter.js.map