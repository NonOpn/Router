"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv = undefined;
try {
    dotenv = require("dotenv");
    if (dotenv)
        dotenv.config();
}
catch (e) {
}
const VERSION = "2.2"; //process.env.VERSION || "1.0";
const config = {
    "identity": process.env.IDENTITY || "undefined",
    "version": VERSION
};
exports.default = config;
//# sourceMappingURL=config.js.map