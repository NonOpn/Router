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
const system_1 = require("../system");
const _1 = require(".");
const frame_model_1 = __importDefault(require("../push_web/frame_model"));
class Reporter {
    constructor() {
        this.started = false;
        this._report = () => __awaiter(this, void 0, void 0, function* () {
            var space = {};
            var count = 0;
            try {
                space = yield system_1.Diskspace.instance.diskspace();
            }
            catch (ee) {
            }
            try {
                count = yield frame_model_1.default.instance.getCount();
            }
            catch (e) {
            }
            try {
                yield _1.Logger.data({ context: "space", space, database: { count } });
            }
            catch (eee) {
            }
        });
    }
    start() {
        if (this.started)
            return;
        this.started = true;
        this._report();
        setInterval(() => this._report(), 60 * 60 * 1000); //60min * 60s * 1000ms
    }
}
exports.default = Reporter;
Reporter.instance = new Reporter();
//# sourceMappingURL=reporter.js.map