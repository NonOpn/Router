"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const enocean_js_1 = __importDefault(require("./enocean.js"));
const server_js_1 = __importDefault(require("./server.js"));
const ble_1 = __importDefault(require("./ble"));
const snmp_js_1 = __importDefault(require("./snmp.js"));
const push_web_js_1 = __importDefault(require("./push_web.js"));
const discovery_1 = __importDefault(require("./discovery"));
const wifi_js_1 = __importDefault(require("./wifi/wifi.js"));
const errors_1 = __importDefault(require("./errors"));
const ssh_js_1 = require("./systemctl/ssh.js");
const index_js_1 = require("./log/index.js");
const wifi = wifi_js_1.default.instance;
const errors = errors_1.default.instance;
class MainEntryPoint {
    constructor() {
    }
    start() {
        console.log("starting routair main program...");
        const cluster = require('cluster');
        if (cluster.isMaster) {
            console.log("MASTER STARTED");
            cluster.fork();
            cluster.on('disconnect', () => {
                console.error('disconnect!');
                cluster.fork();
            });
        }
        else {
            const domain = require('domain');
            const created_domain = domain.create();
            process.on("uncaughtException", (err) => {
                console.log("oups", err);
            });
            created_domain.on('error', (err) => {
                const qSilent = () => {
                    setTimeout(() => {
                        try {
                            // make sure we close down within 30 seconds
                            const killtimer = setTimeout(() => {
                                process.exit(1);
                            }, 30000);
                            // But don't keep the process open just for that!
                            killtimer.unref();
                            cluster.worker.disconnect();
                        }
                        catch (er2) {
                        }
                    }, 30000);
                };
                try {
                    console.log(err);
                    errors.postJsonErrorPromise(err)
                        .then(val => {
                        console.log("post done, quit");
                        qSilent();
                    })
                        .catch(err => {
                        console.log("post error, quit");
                        qSilent();
                    });
                }
                catch (e) {
                    console.log("error error, quit", e);
                    qSilent();
                }
            });
            created_domain.run(() => {
                var enocean = new enocean_js_1.default();
                var server = new server_js_1.default(enocean);
                var snmp = new snmp_js_1.default();
                var push_web = new push_web_js_1.default();
                var discovery_service = new discovery_1.default();
                var ble = new ble_1.default();
                var ssh = new ssh_js_1.SSH();
                var mysql = new ssh_js_1.MySQL();
                //test successfull, since working, will reintroduce it in the future
                //expect around october
                /*
                ssh.stop()
                .then(() => {
                  console.log("ssh stopped normally...");
                  return ssh.disable();
                })
                .then(() => {
                  console.log("ssh disabled normally");
                })
                .catch(err => {
                  console.log("error on ssh", err);
                });
                */
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
                mysql.status()
                    .then(status => {
                    console.log("mysq status := ");
                    console.log(status);
                    index_js_1.Logger.identity(status);
                })
                    .catch(err => {
                    console.error(err);
                });
                wifi.start();
                server.start();
                snmp.connect();
                push_web.connect();
                enocean.register(server);
                discovery_service.bind();
                ble.start();
                enocean.on("usb-open", (port) => {
                    console.log("device opened and ready");
                    server.emit("usb-open");
                });
                enocean.on("usb-closed", (port_instantiated) => {
                    console.log("device removed");
                    server.emit("usb-closed");
                });
                enocean.on("managed_frame", (frame) => {
                    ble.onFrame(frame);
                    server.onFrame(frame);
                    snmp.onFrame(frame);
                    push_web.onFrame(frame);
                });
                enocean.on("frame", (frame) => {
                });
                snmp.on("log", (log) => {
                    server.emit("log", log);
                });
            });
        }
    }
}
exports.default = MainEntryPoint;
//# sourceMappingURL=index.js.map