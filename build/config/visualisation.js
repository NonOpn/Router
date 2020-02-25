"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
;
const config = {
    login: process.env.VISUALISATION_LOGIN,
    password: process.env.VISUALISATION_PASSWORD,
    port: process.env.VISUALISATION_PORT
};
exports.default = config;
//# sourceMappingURL=visualisation.js.map