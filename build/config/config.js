"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const VERSION = "2.0"; //process.env.VERSION || "1.0";
const config = {
    "identity": process.env.IDENTITY,
    "version": VERSION
};
exports.default = config;
//# sourceMappingURL=config.js.map