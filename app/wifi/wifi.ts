import fs from 'fs';
import { exec, ExecException } from 'child_process';
//@ts-ignore
import hostapd from 'wireless-tools/hostapd';
//@ts-ignore
import udhcpd from 'wireless-tools/udhcpd';
//@ts-ignore
import wpa_supplicant from 'wireless-tools/wpa_supplicant';
import ConfigRows, { Config } from './config_rows';
import config from "../config/wifi.js";

const config_rows = new ConfigRows();

const KEY_MODE = "KEY_MODE";
const KEY_WLAN = "KEY_WLAN";
const KEY_AP = "KEY_AP";

const NONE = "none";
const HOSTAP = "hostap";
const WLAN = "wlan";

const STANDARD_WIFI_CONF = "/media/usb/wifi.conf";

//TODO extract this hostapd into something cleaner
export interface WifiConfiguration {
  ssid: string;
  passphrase: string;
}

export interface HostAPConfiguration {
  channel: number;
  hw_mode: string;
  ssid: string;
  wpa: string;
  wpa_passphrase: string;
}

export interface Callback {
  (err: ExecException|null|string, stdout?: string, stderr?: string): void;
}

export default class Wifi {
  static instance = new Wifi();

  _started: boolean = false;
  __inCheckConfig: boolean = false;
  _mode: string|undefined = NONE;
  _interval: NodeJS.Timeout|undefined;
  _saved_ssid: string|undefined;
  _saved_passphrase: string|undefined;

  constructor() {

  }

  disableDNSMasq() {
    const config = "#Pi3Hotspot Config - disabled by routair\n"
    + "#stop DNSmasq from using resolv.conf\n"
    + "no-resolv\n"
    + "#Interface to use\n"
    + "interface=lo\n"
    + "bind-interfaces\n"
    + "dhcp-range=10.0.0.3,10.0.0.20,12h\n";

    return this.writeDNSMasq(config);
  }

  enableDNSMasq() {
    const config = "#Pi3Hotspot Config - enabled by routair\n"
    + "#stop DNSmasq from using resolv.conf\n"
    + "no-resolv\n"
    + "#Interface to use\n"
    + "interface=lo,wlan0\n"
    + "bind-interfaces\n"
    + "dhcp-range=10.0.0.3,10.0.0.20,12h\n";

    return this.writeDNSMasq(config);
  }

  
  writeDNSMasq(config: string) {
    return new Promise((resolve, reject) => {
      fs.writeFile("/etc/dnsmasq.conf", config, (err) => {
        if (err) {
          console.log("error", err);
          resolve(false);
          return;
        }
        console.log("copying data into", "/etc/dnsmasq.conf");
        resolve(true);
      });
    });
  }

  removeUnwanted(string: string): string {
    //replace \\ to \
    while(string.indexOf("\\\\") >= 0) {
      string = string.replace(/\\\\/g, "\\") //replace every \\ to \
    }
  
    return string.replace(/\\'/g, "'") //replace \' to '
        .replace(/'/g, "\\'"); //switch back every legit ' and vilainous \'
  }

  saveSSID(wpa_supplicant_conf: string, ssid: string, passphrase: string, callback: Callback): any {
    ssid = this.removeUnwanted(ssid);
    passphrase = this.removeUnwanted(passphrase);
  
    if(!ssid || !passphrase || passphrase.length < 8 || passphrase.length > 63) {
      callback("invalid passphrase, ssid");
      return;
    }
  
    var command = "wpa_passphrase '" + ssid + "' '" + passphrase + "' >> " + wpa_supplicant_conf;
  
    return exec(command, callback);
  }

  start() {
    if(config.enabled && !this._started) {
      this.__inCheckConfig = false;
      this._mode = NONE;
      this._started = true;
  
      const _start = () => {
        this._interval = setInterval(() => {
          if(!this.__inCheckConfig) {
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
      .then((mode: Config|undefined) => {
        if(mode && mode.key) {
          this._mode = mode.value;
        } else {
          this._mode = NONE;
        }
  
        var promise = undefined;
        var callback = (config:any) => { return new Promise((r, rr) => { r(true); })}; //promise true
        if(this._mode == HOSTAP) {
          promise = config_rows.getKey(KEY_AP);
          callback = (c) => { return this.startHostAP(c)};
        } else if(this._mode == WLAN) {
          promise = config_rows.getKey(KEY_WLAN);
          callback = (c) => { return this.startWLAN0(c, false)};
        }
  
        if(promise) {
          console.log("loading configuration for ", this._mode);
          promise.then((result: Config|undefined) => {
            if(result && result.value) {
              const json = JSON.parse(result.value);
              console.log("configuration found for " + result.key, json);
  
              callback(json)
              .then(finished => {
                console.log("saved configuration loaded := ", finished);
                if(!finished && this._mode == HOSTAP) { //FOR NOW ONLY
                  this._mode = NONE;
                }
                _start();
              })
            }
          });
        } else {
          console.log("no saved configuration, waiting for conf ...");
          _start();
        }
  
      })
  
    } else if(!config.enabled) {
      console.log("wifi listener not started");
    }
  }

  storeConfiguration(configuration: WifiConfiguration): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.startWLAN0(configuration, true)
      .then(finished => {
        console.log("finished ? ", finished);
        if(finished) {
          config_rows.save(KEY_WLAN, JSON.stringify(configuration))
          .then(() => {
            config_rows.save(KEY_MODE, WLAN)
            .then(() => {
              this._saved_ssid = configuration.ssid;
              this._saved_passphrase = configuration.passphrase;
              resolve(true);
            })
            .catch((err:any) => reject(err));
          })
          .catch((err:any) => reject(err));
        } else {
          resolve(false);
        }
      })
      .catch(err => reject(err));
    });
  }
  
  checkConfig(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        if (fs.existsSync(STANDARD_WIFI_CONF)) {
          const config = JSON.parse(fs.readFileSync(STANDARD_WIFI_CONF, 'utf8'));
          var found = false;
  
          if(!found && config.wlan && config.mode == WLAN) {
            console.log(this._saved_ssid, config.wlan.ssid);
            console.log(this._saved_passphrase, config.wlan.passphrase);
            if(this._mode != WLAN || this._saved_ssid != config.wlan.ssid || this._saved_passphrase != config.wlan.passphrase) {
              console.log("config wlan found", config.wlan);
  
              this.storeConfiguration(config.wlan)
              .then(() => {
                resolve(true);
              })
              .catch(err => {
                resolve(false);
              })
            } else {
              console.log("already wifi mode set");
              resolve(true);
            }
          } else {
            resolve(true);
          }
        } else {
          this._mode = NONE;
          resolve(true);
        }
      } catch (err) {
        console.log(err);
        reject(err);
      }
    });
  }
  
  startHostAP(config: HostAPConfiguration): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if(config && config.channel && config.hw_mode && config.ssid && config.wpa && config.wpa_passphrase) {
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
            dns: [ '4.4.4.4', '8.8.8.8' ]
          }
        };
  
        wpa_supplicant.disable("wlan0", (err:any) => {
          console.log(err);
          hostapd.enable(options, (err:any) => {
            console.log("finished ? ", err);
            if(!err) {
              udhcpd.enable(options_dhcp, (err:any) => {
                console.log("finished dhcp ? ", err);
                this._mode = HOSTAP;
                resolve(true);
              });
            } else {
              resolve(false);
            }
          });
        });
      } else {
        console.log("invalid config", config);
        resolve(false);
      }
    });
  }
  
  startWLAN0(config: WifiConfiguration, save: boolean): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if(config && config.ssid && config.passphrase) {
  
        var options = {
          interface: 'wlan0',
          ssid: config.ssid,
          passphrase: config.passphrase,
          driver: "wext"
        };
  
        if(!save) {
          this._mode = WLAN;
  
          //wpa_supplicant.enable(options, (err) => {
          //console.log("finished ? ", err);
          //});
          resolve(true);
        } else {
          hostapd.disable('wlan0', (err:any) => {
            console.log(err);
            udhcpd.disable('wlan0', (err:any) => {
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
                  if(err) {
                    console.log("save ? ", err);
                    resolve(false);
                  } else {
                    console.log("wifi save ok");
                    resolve(true);
                  }
                });
              } catch(e) {
                console.log(e);
                resolve(false);
              }
            });
          });
          //});
        }
      } else {
        console.log("invalid config", config);
        resolve(false);
      }
    });
  }
}