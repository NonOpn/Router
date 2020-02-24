"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const from_config = process.env.PUSH_WEB_ACTIVATED;
;
var config = {
    is_activated: "true" == from_config || from_config == true
};
exports.default = config;
//# sourceMappingURL=push_web.js.map