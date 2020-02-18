"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const json = { enocean_endpoint: process.env.ENOCEAN_ENDPOINT };
//set default value
if (json.enocean_endpoint == undefined || json.enocean_endpoint.length < 3) {
    json.enocean_endpoint = undefined;
}
exports.default = json;
//# sourceMappingURL=enocean.js.map