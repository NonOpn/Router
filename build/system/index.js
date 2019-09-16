"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fd_diskspace_1 = __importDefault(require("fd-diskspace"));
class Diskspace {
    constructor() {
    }
    diskspace() {
        return new Promise((resolve, reject) => {
            fd_diskspace_1.default.diskSpace((err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    var res = { free: 0, size: 0, used: 0, percent: 0 };
                    if (result && result.total) {
                        res.free = result.total.free || 0;
                        res.size = result.total.size || 0;
                        res.used = result.total.used || 0;
                        res.percent = result.total.percent || 0;
                    }
                    resolve(res);
                }
            });
        });
    }
}
Diskspace.instance = new Diskspace();
exports.default = Diskspace;
//# sourceMappingURL=index.js.map