"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const system_1 = require("../system");
const _1 = require(".");
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
            if (space) {
                _1.Logger.identity(space, ["space"]);
            }
        })
            .catch(err => console.log(err));
    }
}
Reporter.instance = new Reporter();
exports.default = Reporter;
//# sourceMappingURL=reporter.js.map