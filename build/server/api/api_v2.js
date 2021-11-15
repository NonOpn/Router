"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Diagnostic_1 = __importDefault(require("../../diagnostic/Diagnostic"));
const router = express_1.default.Router();
router.post("/diagnostic.json", (req, res) => {
    if (res && res.body) {
        var body = undefined;
        try {
            if (typeof res.body == "string")
                body = JSON.parse(res.body);
        }
        catch (e) {
            body = res.body;
        }
        Diagnostic_1.default.onConfiguration(body);
        res.json(body);
    }
    else {
        res.status(500).json({ error: "invalid body received" });
    }
});
exports.default = router;
//# sourceMappingURL=api_v2.js.map