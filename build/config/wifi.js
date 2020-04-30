"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const wifi = process.env.WIFI_USB_ENABLED;
;
const config = {
    enabled: wifi === "true" || wifi === true
};
exports.default = config;
//# sourceMappingURL=wifi.js.map