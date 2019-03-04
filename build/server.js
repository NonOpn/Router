"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const events_1 = require("events");
const socket_io_1 = __importDefault(require("socket.io"));
const setup_1 = __importDefault(require("setup"));
const api_v1_1 = __importDefault(require("./server/api/api_v1"));
const api_public_1 = __importDefault(require("./server/api/api_public"));
const body_parser_1 = __importDefault(require("body-parser"));
const visualisation_js_1 = __importDefault(require("../config/visualisation.js"));
const wifi_1 = __importDefault(require("./wifi/wifi"));
const app = express_1.default();
const setup = setup_1.default();
const wifi = wifi_1.default.instance;
var port = visualisation_js_1.default.port;
var server = require("http").Server(app);
var io = socket_io_1.default(server);
function isValidIP(value) {
    var ip = "^((1[0-9][0-9]|1[0-9]|2[0-5][0-5]|[0-9])(\.|$)){4}$";
    return value && value.match && value.match(ip);
}
function isValidIPs(array) {
    return array.filter((value) => {
        return !isValidIP(value);
    }).length == 0;
}
function manageNewNetworkData(intface, data) {
    var valid = false;
    var ip = data.ip;
    var gateway = data.gateway;
    var netmask = data.netmask;
    var dns = data.dns;
    const network = {
        auto: true
    };
    if (data) {
        valid = data.dhcp === "on" || isValidIPs([ip, gateway, netmask, dns]);
    }
    if (valid) {
        if (data.dhcp === "on") {
            network.dhcp = true;
        }
        else {
            network.ipv4 = {
                address: ip,
                netmask: netmask,
                gateway: gateway,
                dns: dns
            };
        }
        var conf = {};
        if (intface == "eth0") {
            conf.eth0 = network;
        }
        else if (intface == "wlan0") {
            conf.wlan0 = network;
        }
        var config = setup.network.config(conf);
        setup.network.save(config);
        console.log("saved", config);
        return true;
    }
    return false;
}
class Server extends events_1.EventEmitter {
    constructor(enocean_manager) {
        super();
        this.enocean_manager = enocean_manager;
        io.on("connection", function (socket) {
            enocean_manager.register(socket);
            const net = (type, data) => {
                try {
                    const result = manageNewNetworkData(type, data);
                    socket.emit("network-config", result);
                }
                catch (e) {
                    console.log(e);
                    socket.emit("network-config-error", "Error while saving data");
                }
            };
            socket.on("new-network-wifi-conf", (network) => {
                //{ssid: //, psk: //}
                if (network && network.ssid && network.passphrase) {
                    wifi.storeConfiguration(network)
                        .then((success) => {
                        if (success === true) {
                            socket.emit("network-config-error-wifi", "Configuration saved. Please wait 1min for it to activate");
                        }
                        else {
                            socket.emit("network-config-error-wifi", "Error while configuring the network data");
                        }
                    });
                }
                else {
                    socket.emit("network-config-error-wifi", "Error with wifi information");
                }
            });
            socket.on("new-network-state-wlan0", (data) => {
                net("wlan0", data);
            });
            socket.on("new-network-state-eth0", (data) => {
                net("eth0", data);
            });
        });
        io.on("network_conf", function (socket) {
            console.log();
        });
        this.on("usb-closed", function () {
            io.sockets.emit("usb-closed");
        });
        this.on("usb-open", function () {
            io.sockets.emit("usb-open");
        });
    }
    start() {
        app
            .use(body_parser_1.default.json())
            .use("/api/public", api_public_1.default)
            .use("/api/v1", api_v1_1.default)
            .use(express_1.default.static("./server/html"));
        server.listen(port);
    }
    onFrame(frame) {
        io.sockets.emit("managed_frame", { data: frame });
    }
}
exports.default = Server;
//# sourceMappingURL=server.js.map