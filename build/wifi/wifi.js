"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const hostapd_1 = __importDefault(require("wireless-tools/hostapd"));
const udhcpd_1 = __importDefault(require("wireless-tools/udhcpd"));
const wpa_supplicant_1 = __importDefault(require("wireless-tools/wpa_supplicant"));
const config_rows_1 = __importDefault(require("./config_rows"));
const wifi_js_1 = __importDefault(require("../config/wifi.js"));
const config_rows = new config_rows_1.default();
const KEY_MODE = "KEY_MODE";
const KEY_WLAN = "KEY_WLAN";
const KEY_AP = "KEY_AP";
const NONE = "none";
const HOSTAP = "hostap";
const WLAN = "wlan";
const STANDARD_WIFI_CONF = "/media/usb/wifi.conf";
class Wifi {
    constructor() {
        this._started = false;
        this.__inCheckConfig = false;
        this._mode = NONE;
    }
    removeUnwanted(string) {
        //replace \\ to \
        while (string.indexOf("\\\\") >= 0) {
            string = string.replace(/\\\\/g, "\\"); //replace every \\ to \
        }
        return string.replace(/\\'/g, "'") //replace \' to '
            .replace(/'/g, "\\'"); //switch back every legit ' and vilainous \'
    }
    saveSSID(wpa_supplicant_conf, ssid, passphrase, callback) {
        ssid = this.removeUnwanted(ssid);
        passphrase = this.removeUnwanted(passphrase);
        if (!ssid || !passphrase || passphrase.length < 8 || passphrase.length > 63) {
            callback("invalid passphrase, ssid");
            return;
        }
        var command = "wpa_passphrase '" + ssid + "' '" + passphrase + "' >> " + wpa_supplicant_conf;
        return child_process_1.exec(command, callback);
    }
    start() {
        if (wifi_js_1.default.enabled && !this._started) {
            this.__inCheckConfig = false;
            this._mode = NONE;
            this._started = true;
            const _start = () => {
                this._interval = setInterval(() => {
                    if (!this.__inCheckConfig) {
                        this.__inCheckConfig = true;
                        this.checkConfig()
                            .then(finished => {
                            this.__inCheckConfig = false;
                        }).catch(err => {
                            console.log(err);
                            this.__inCheckConfig = false;
                        });
                    }
                }, 15000);
            };
            config_rows.getKey(KEY_MODE)
                .then((mode) => {
                if (mode && mode.key) {
                    this._mode = mode.value;
                }
                else {
                    this._mode = NONE;
                }
                var promise = undefined;
                var callback = (config) => { return new Promise((r, rr) => { r(true); }); }; //promise true
                if (this._mode == HOSTAP) {
                    promise = config_rows.getKey(KEY_AP);
                    callback = (c) => { return this.startHostAP(c); };
                }
                else if (this._mode == WLAN) {
                    promise = config_rows.getKey(KEY_WLAN);
                    callback = (c) => { return this.startWLAN0(c, false); };
                }
                if (promise) {
                    console.log("loading configuration for ", this._mode);
                    promise.then((result) => {
                        if (result && result.value) {
                            const json = JSON.parse(result.value);
                            console.log("configuration found for " + result.key, json);
                            callback(json)
                                .then(finished => {
                                console.log("saved configuration loaded := ", finished);
                                if (!finished && this._mode == HOSTAP) { //FOR NOW ONLY
                                    this._mode = NONE;
                                }
                                _start();
                            });
                        }
                    });
                }
                else {
                    console.log("no saved configuration, waiting for conf ...");
                    _start();
                }
            });
        }
        else if (!wifi_js_1.default.enabled) {
            console.log("wifi listener not started");
        }
    }
    storeConfiguration(configuration) {
        return new Promise((resolve, reject) => {
            this.startWLAN0(configuration, true)
                .then(finished => {
                console.log("finished ? ", finished);
                if (finished) {
                    config_rows.save(KEY_WLAN, JSON.stringify(configuration))
                        .then(() => {
                        config_rows.save(KEY_MODE, WLAN)
                            .then(() => {
                            this._saved_ssid = configuration.ssid;
                            this._saved_passphrase = configuration.passphrase;
                            resolve(true);
                        })
                            .catch((err) => reject(err));
                    })
                        .catch((err) => reject(err));
                }
                else {
                    resolve(false);
                }
            })
                .catch(err => reject(err));
        });
    }
    checkConfig() {
        return new Promise((resolve, reject) => {
            try {
                if (fs_1.default.existsSync(STANDARD_WIFI_CONF)) {
                    const config = JSON.parse(fs_1.default.readFileSync(STANDARD_WIFI_CONF, 'utf8'));
                    var found = false;
                    if (!found && config.wlan && config.mode == WLAN) {
                        console.log(this._saved_ssid, config.wlan.ssid);
                        console.log(this._saved_passphrase, config.wlan.passphrase);
                        if (this._mode != WLAN || this._saved_ssid != config.wlan.ssid || this._saved_passphrase != config.wlan.passphrase) {
                            console.log("config wlan found", config.wlan);
                            this.storeConfiguration(config.wlan)
                                .then(() => {
                                resolve(true);
                            })
                                .catch(err => {
                                resolve(false);
                            });
                        }
                        else {
                            console.log("already wifi mode set");
                            resolve(true);
                        }
                    }
                    else {
                        resolve(true);
                    }
                }
                else {
                    this._mode = NONE;
                    resolve(true);
                }
            }
            catch (err) {
                console.log(err);
                reject(err);
            }
        });
    }
    startHostAP(config) {
        return new Promise((resolve, reject) => {
            if (config && config.channel && config.hw_mode && config.ssid && config.wpa && config.wpa_passphrase) {
                //extracted from https://www.npmjs.com/package/wireless-tools#hostapd
                var options = {
                    channel: config.channel,
                    //driver: 'rtl871xdrv',
                    hw_mode: config.hw_mode,
                    interface: 'wlan0',
                    ssid: config.ssid,
                    wpa: config.wpa,
                    wpa_passphrase: config.wpa_passphrase
                };
                var options_dhcp = {
                    interface: 'wlan0',
                    start: '192.168.10.10',
                    end: '192.168.10.20',
                    option: {
                        router: '192.168.10.1',
                        subnet: '255.255.255.0',
                        dns: ['4.4.4.4', '8.8.8.8']
                    }
                };
                wpa_supplicant_1.default.disable("wlan0", (err) => {
                    console.log(err);
                    hostapd_1.default.enable(options, (err) => {
                        console.log("finished ? ", err);
                        if (!err) {
                            udhcpd_1.default.enable(options_dhcp, (err) => {
                                console.log("finished dhcp ? ", err);
                                this._mode = HOSTAP;
                                resolve(true);
                            });
                        }
                        else {
                            resolve(false);
                        }
                    });
                });
            }
            else {
                console.log("invalid config", config);
                resolve(false);
            }
        });
    }
    startWLAN0(config, save) {
        return new Promise((resolve, reject) => {
            if (config && config.ssid && config.passphrase) {
                var options = {
                    interface: 'wlan0',
                    ssid: config.ssid,
                    passphrase: config.passphrase,
                    driver: "wext"
                };
                if (!save) {
                    this._mode = WLAN;
                    //wpa_supplicant.enable(options, (err) => {
                    //console.log("finished ? ", err);
                    //});
                    resolve(true);
                }
                else {
                    hostapd_1.default.disable('wlan0', (err) => {
                        console.log(err);
                        udhcpd_1.default.disable('wlan0', (err) => {
                            console.log(err);
                            //wpa_cli.add_network("wlan0", (err, res) => {
                            //const id = res ? res.result : undefined;
                            //console.log(id, err);
                            //if(id) {
                            //wpa_cli.set_network("wlan0", id, "ssid", `'"${options.ssid}"'`, (err) => {
                            //console.log(err);
                            //wpa_cli.set_network("wlan0", id, "psk", `'"${options.passphrase}"'`, (err) => {
                            //console.log("set network", err);
                            //wpa_cli.enable_network("wlan0", id, (err) => {
                            //console.log("enable_network", err);
                            //wpa_cli.save_config("wlan0", (err, data) => {
                            //console.log("save_config", err);
                            //try{
                            //if(!err) {
                            //this._mode = WLAN;
                            //wpa_supplicant.enable(options, (err) => {
                            //console.log("finished ? ", err);
                            //});
                            //}
                            //}catch(e) { console.log(e)};
                            //resolve(true);
                            //});
                            //});
                            //});
                            //});
                            //} else {
                            //console.log("error?", res);
                            //console.log("error?", err);
                            //resolve(JSON.stringify(res));
                            //}
                            try {
                                const wpa_supplicant = "/etc/wpa_supplicant/wpa_supplicant.conf";
                                const ssid = config.ssid;
                                const passphrase = config.passphrase;
                                this.saveSSID(wpa_supplicant, ssid, passphrase, (err) => {
                                    if (err) {
                                        console.log("save ? ", err);
                                        resolve(false);
                                    }
                                    else {
                                        console.log("wifi save ok");
                                        resolve(true);
                                    }
                                });
                            }
                            catch (e) {
                                console.log(e);
                                resolve(false);
                            }
                        });
                    });
                    //});
                }
            }
            else {
                console.log("invalid config", config);
                resolve(false);
            }
        });
    }
}
Wifi.instance = new Wifi();
exports.default = Wifi;
//# sourceMappingURL=wifi.js.map