"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = require("./Command");
class Touch {
    exec(filename) {
        const command = new Command_1.Command();
        return command.exec("/usr/bin/touch", [filename]);
    }
}
exports.Touch = Touch;
//# sourceMappingURL=Touch.js.map