"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const mqtt_1 = __importDefault(require("mqtt"));
const mqtt_json_1 = __importDefault(require("../config/mqtt.json"));
class MQTT extends events_1.EventEmitter {
    connect() {
        if (mqtt_1.default /*.mqtt*/) {
            try {
                this.client = mqtt_1.default.connect(mqtt_json_1.default.mqtt_address, {
                    username: mqtt_json_1.default.mqtt_login,
                    password: mqtt_json_1.default.mqtt_password,
                    reconnectPeriod: 10000
                });
                this.client.on("socket", (socket) => {
                    console.log(socket);
                });
                this.client.on("error", (e) => {
                    console.log(e);
                });
                this.client.on('connect', () => {
                    console.log("connected");
                    this.client && this.client.publish("router/connect", JSON.stringify({
                        "router": "debug"
                    }));
                });
            }
            catch (e) {
                console.log(e);
            }
        }
        else {
            console.log("mqtt disabled");
        }
    }
    onFrame(data) {
        console.log("having frame to send to mqtt");
        try {
            this.client && this.client.publish("router/raw", JSON.stringify(data), { "qos": 2 });
        }
        catch (e) {
            console.log(e);
        }
    }
}
exports.default = MQTT;
//# sourceMappingURL=mqtt.js.map