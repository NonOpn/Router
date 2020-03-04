"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./systemctl/index");
const enocean_js_1 = __importDefault(require("./enocean.js"));
const server_js_1 = __importDefault(require("./server.js"));
const ble_1 = __importDefault(require("./ble"));
const snmp_js_1 = __importDefault(require("./snmp.js"));
const push_web_js_1 = __importDefault(require("./push_web.js"));
const discovery_1 = __importDefault(require("./discovery"));
const wifi_js_1 = __importDefault(require("./wifi/wifi.js"));
const errors_1 = __importDefault(require("./errors"));
const systemctl_1 = require("./systemctl");
const index_js_1 = require("./log/index.js");
const index_js_2 = __importDefault(require("./system/index.js"));
const reporter_js_1 = __importDefault(require("./log/reporter.js"));
const frame_manager_alert_js_1 = __importDefault(require("./frame_manager_alert.js"));
const wifi = wifi_js_1.default.instance;
const errors = errors_1.default.instance;
const RESTART_DELAY = 180000; //restart the program after 180 000 ms
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
                            // make sure we close down within RESTART_DELAY milliseconds
                            const killtimer = setTimeout(() => {
                                process.exit(1);
                            }, RESTART_DELAY);
                            // But don't keep the process open just for that!
                            killtimer.unref();
                            cluster.worker.disconnect();
                        }
                        catch (er2) {
                        }
                    }, RESTART_DELAY);
                };
                try {
                    console.log(err);
                    errors.postJsonErrorPromise(err, "main crash")
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
                new Promise((resolve) => {
                    reporter_js_1.default.instance.start();
                    index_js_2.default.instance.usage()
                        .then(usage => {
                        if (usage) {
                            index_js_1.Logger.identity({ usage }, ["usage"]);
                        }
                        //delay the answer to prevent any issue in this session - to improve, just exploring new features
                        setTimeout(() => resolve(true), 5000);
                    })
                        .catch(err => {
                        console.log(err);
                        //delay the answer to prevent any issue in this session - to improve, just exploring new features
                        setTimeout(() => resolve(true), 5000);
                    });
                }).then(() => {
                    var enocean = new enocean_js_1.default();
                    var server = new server_js_1.default(enocean);
                    var snmp = new snmp_js_1.default();
                    var push_web = new push_web_js_1.default();
                    var discovery_service = new discovery_1.default();
                    var ble = new ble_1.default();
                    var ssh = new systemctl_1.SSH();
                    var frame_manager_alert = new frame_manager_alert_js_1.default();
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
                    new index_1.Apt().list()
                        .then(result => {
                        index_js_1.Logger.data({
                            packages: (result || "").split("\n").filter(s => s.indexOf("blue") >= 0 || s.indexOf("bootloader") >= 0),
                            option: "bluetooth"
                        });
                    })
                        .catch(err => index_js_1.Logger.error(err, "Error with bluetooth status"));
                    const FIRMWARE = "raspberrypi-bootloader";
                    const fn_upgradable = () => {
                        return new index_1.Apt().list()
                            .then(result => (result || "").split("\n").find(s => s.indexOf(FIRMWARE) >= 0))
                            .then(bootlader => ({
                            upgradable: (bootlader || "").indexOf("upgradable") >= 0,
                            version: bootlader || ""
                        }));
                    };
                    const bluetooth_packages = ["bluez", "bluez-firmware", "pi-bluetooth"];
                    const fn_upgradable_bluetooth = () => {
                        const to_upgrade = (lines, pack) => !!(lines.find(line => (line.indexOf(pack + "/") >= 0) && (line.indexOf("upgradable") >= 0)));
                        return new index_1.Apt().list()
                            .then(result => (result || "").split("\n"))
                            .then(installed => bluetooth_packages.map(pack => to_upgrade(installed, pack) ? pack : ""))
                            .then(to_update => to_update.filter(pack => pack.length > 0));
                    };
                    fn_upgradable_bluetooth()
                        .then(to_update => {
                        if (to_update.length == 0)
                            return Promise.resolve(true);
                        console.log("upgradable packages", { to_update });
                        index_js_1.Logger.data({ to_update, bluetooth_packages });
                        return new index_1.Apt().installs(to_update)
                            .then(() => fn_upgradable_bluetooth())
                            .then(to_update => {
                            index_js_1.Logger.data({ to_update, bluetooth_packages });
                            return to_update.length == 0;
                        });
                    })
                        .catch(err => index_js_1.Logger.error(err, "Error with bootloader status"));
                    fn_upgradable()
                        .then(({ upgradable, version }) => {
                        console.log("upgradable", { upgradable, version });
                        index_js_1.Logger.data({ upgradable, version, option: FIRMWARE });
                        if (!upgradable) {
                            return true;
                        }
                        else {
                            return new index_1.Apt().install(FIRMWARE)
                                .then(() => fn_upgradable())
                                .then(({ upgradable, version }) => {
                                index_js_1.Logger.data({ upgradable, version, option: FIRMWARE });
                                return upgradable;
                            });
                        }
                    })
                        .catch(err => index_js_1.Logger.error(err, "Error with bootloader status"));
                    const which = new index_1.Which();
                    which.which("hciconfig")
                        .then(status => {
                        index_js_1.Logger.data({ service: "which", cmd: "hciconfig", status });
                    })
                        .then(res => { })
                        .catch(err => index_js_1.Logger.error(err, "Error with hciconfig status"));
                    index_1.exists("/bin/hciconfig")
                        .then(ok => {
                        if (ok) {
                            index_js_1.Logger.data({ service: "exists", cmd: "hciconfig", ok });
                            return Promise.resolve(true);
                        }
                        else {
                            index_js_1.Logger.data({ service: "does_not_exists", cmd: "hciconfig", ok });
                            return new index_1.Apt().install("armv7-bluez-osmc")
                                .then(status => {
                                index_js_1.Logger.data({ service: "apt", cmd: "armv7-bluez-osmc", status });
                                return which.which("hciconfig");
                            })
                                .then(status => {
                                index_js_1.Logger.data({ service: "which", cmd: "hciconfig", status });
                                return true;
                            });
                        }
                    })
                        .then(res => bluetooth.hcistatus())
                        .then(status => {
                        index_js_1.Logger.data({ service: "hciconfig", status });
                        return bluetooth.up();
                    })
                        .then(res => console.log("hci dddonnnee ?"))
                        .catch(err => index_js_1.Logger.error(err, "Error with hciconfig exists or armv7-bluez-osmc"));
                    const bluetooth = new index_1.Bluetooth();
                    bluetooth.status()
                        .then(status => {
                        index_js_1.Logger.data({ service: "bluetooth", status });
                        return bluetooth.start();
                    })
                        .then(res => { })
                        .catch(err => index_js_1.Logger.error(err, "Error with bluetooth status"));
                    wifi.start();
                    server.start();
                    snmp.connect();
                    push_web.connect();
                    enocean.register(server);
                    discovery_service.bind();
                    ble.start();
                    frame_manager_alert.start();
                    if (ble.needRepair()) {
                        new index_1.Cat()
                            .exec("/etc/systemd/system/routair.service")
                            .then(service => {
                            return index_1.npm()
                                .then(path => new index_1.Rebuild().exec("bluetooth-hci-socket", path))
                                .then(rebuild => index_js_1.Logger.data({ rebuild }))
                                .catch(() => "")
                                .then(rebuild => index_js_1.Logger.data({ service, rebuild }));
                        })
                            .catch(err => index_js_1.Logger.error(err));
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
            });
        }
    }
}
exports.default = MainEntryPoint;
//# sourceMappingURL=index.js.map