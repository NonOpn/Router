"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = __importDefault(require("../../config/config"));
const router = express_1.default.Router();
router.get("/infos.json", (req, res) => {
    const date = new Date();
    res.json({
        timestamp: Math.floor(date.getTime() / 1000),
        date: date,
        identity: config_1.default.identity,
        version: config_1.default.version
    });
});
exports.default = router;
//# sourceMappingURL=api_public.js.map