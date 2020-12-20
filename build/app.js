"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./systemctl/index");
const enocean_js_1 = __importDefault(require("./enocean.js"));
const server_js_1 = __importDefault(require("./server.js"));
const ble_1 = __importDefault(require("./ble"));
const snmp_js_1 = __importDefault(require("./snmp.js"));
const push_web_js_1 = __importDefault(require("./push_web.js"));
const discovery_1 = __importDefault(require("./discovery"));
const wifi_js_1 = __importDefault(require("./wifi/wifi.js"));
const systemctl_1 = require("./systemctl");
const index_js_1 = require("./log/index.js");
const reporter_js_1 = __importDefault(require("./log/reporter.js"));
const frame_manager_alert_js_1 = __importDefault(require("./frame_manager_alert.js"));
const device_1 = __importDefault(require("./ble/device"));
const network_1 = __importDefault(require("./network"));
const wifi = wifi_js_1.default.instance;
class App {
    constructor() {
    }
    start() {
        new Promise((resolve) => {
            reporter_js_1.default.instance.start();
            //delay the answer to prevent any issue in this session - to improve, just exploring new features
            setTimeout(() => resolve(true), 5000);
        }).then(() => {
            var enocean = new enocean_js_1.default();
            var server = new server_js_1.default(enocean);
            var snmp = new snmp_js_1.default();
            var push_web = new push_web_js_1.default();
            var discovery_service = new discovery_1.default();
            var ble = new ble_1.default();
            var ssh = new systemctl_1.SSH();
            var network = new systemctl_1.Network();
            var frame_manager_alert = new frame_manager_alert_js_1.default();
            network.ifup("eth0").then(() => console.log("eth0 up")).catch(err => console.log(err));
            ssh.enable()
                .then(() => {
                console.log("ssh enabled normally...");
                return ssh.start();
            })
                .then(() => {
                console.log("ssh started normally");
            })
                .catch(err => {
                console.log("error on ssh", err);
            });
            const bluetooth = new index_1.Bluetooth();
            bluetooth.status()
                .then(status => {
                if (!network_1.default.instance.isGPRS()) {
                    index_js_1.Logger.data({ service: "bluetooth", status });
                }
                return bluetooth.start();
            })
                .then(res => { })
                .catch(err => !network_1.default.instance.isGPRS() && index_js_1.Logger.error(err, "Error with bluetooth status"));
            // make sure the interface is up
            bluetooth.up().then(() => {
                if (!network_1.default.instance.isGPRS())
                    index_js_1.Logger.data({ content: "blue", status: "up" });
            }).catch(err => {
                if (!network_1.default.instance.isGPRS())
                    index_js_1.Logger.error(err, "ble_up");
            });
            wifi.start();
            server.start();
            snmp.connect();
            push_web.connect();
            //enocean.register(server);
            discovery_service.bind();
            ble.start();
            frame_manager_alert.start();
            wifi.disableDNSMasq().then(() => { }).catch(() => { });
            if (ble.needRepair()) {
                new index_1.Cat()
                    .exec("/etc/systemd/system/routair.service")
                    .then(service => {
                    return index_1.npm()
                        .then(path => new index_1.Rebuild().exec("bluetooth-hci-socket", path))
                        .catch(() => "");
                })
                    .catch(err => !network_1.default.instance.isGPRS() && index_js_1.Logger.error(err));
            }
            enocean.on("usb-open", (port) => {
                console.log("device opened and ready");
                server.emit("usb-open");
            });
            enocean.on("usb-closed", (port_instantiated) => {
                console.log("device removed");
                server.emit("usb-closed");
            });
            enocean.on("managed_frame", (frame) => {
                device_1.default.instance.onFrame(frame)
                    .then(device => {
                    console.log("device frame := ", { device: device ? device.json() : undefined });
                    push_web.onFrame(device, frame);
                    ble.onFrame(device, frame);
                }).catch(err => !network_1.default.instance.isGPRS() && index_js_1.Logger.error(err, "error in managed frame"));
                server.onFrame(frame);
                snmp.onFrame(frame);
            });
            enocean.on("frame", (frame) => {
            });
            enocean.init();
            snmp.on("log", (log) => {
                server.emit("log", log);
            });
        });
    }
    ;
}
module.exports.App = App;
//# sourceMappingURL=app.js.map