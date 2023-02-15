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
const from_config = process.env.PUSH_WEB_ACTIVATED;
;
var config = {
    is_activated: "false" != from_config && from_config != false
};
exports.default = config;
//# sourceMappingURL=push_web.js.map