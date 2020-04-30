"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
;
const config = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
};
exports.default = config;
//# sourceMappingURL=mysql.js.map