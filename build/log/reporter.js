"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const system_1 = require("../system");
const _1 = require(".");
const frame_model_1 = __importDefault(require("../push_web/frame_model"));
class Reporter {
    constructor() {
        this.started = false;
    }
    start() {
        if (this.started)
            return;
        this.started = true;
        this._report();
        setInterval(() => this._report(), 60 * 60 * 1000); //60min * 60s * 1000ms
    }
    _report() {
        system_1.Diskspace.instance.diskspace()
            .then(space => {
            return frame_model_1.default.instance.getCount()
                .then(count => {
                _1.Logger.data({ context: "space", space, database: { count } });
            });
        })
            .catch(err => console.log(err));
    }
}
exports.default = Reporter;
Reporter.instance = new Reporter();
//# sourceMappingURL=reporter.js.map