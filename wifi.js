var hostapd = require('wireless-tools/hostapd');
var wpa_supplicant = require('wireless-tools/wpa_supplicant');
var fs = require('fs');
config = require("./config/wifi.js");
var wpa_cli = require('wireless-tools/wpa_cli');

const config_rows = require("./wifi/config_rows");

const KEY_MODE = "KEY_MODE";
const KEY_WLAN = "KEY_WLAN";
const KEY_AP = "KEY_AP";

const NONE = "none";
const HOSTAP = "hostap";
const WLAN = "wlan";

const STANDARD_WIFI_CONF = "/media/usb/wifi.conf";

//TODO extract this hostapd into something cleaner

function Wifi() {

}

Wifi.prototype.start = function() {
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
            console.log("checkConfig finished with", finished);
            this.__inCheckConfig = false;
          }).catch(err => {
            console.log(err);
            this.__inCheckConfig = false;
          });
        }
      }, 15000);
    };

    config_rows.getKey(KEY_MODE)
    .then(mode => {
      if(mode && mode.key) {
        this._mode = mode.value;
      } else {
        this._mode = NONE;
      }

      var promise = undefined;
      var callback = (config) => { return new Promise((r, rr) => { r(true); })}; //promise true
      if(this._mode == HOSTAP) {
        promise = config_rows.getKey(KEY_AP);
        callback = (c) => { return this.startHostAP(c)};
      } else if(this._mode == WLAN) {
        promise = config_rows.getKey(KEY_WLAN);
        callback = (c) => { return this.startWLAN0(c)};
      }

      if(promise) {
        console.log("loading configuration for ", this._mode);
        promise.then(result => {
          if(result && result.value) {
            const json = JSON.parse(result.value);
            console.log("configuration found for " + result.key, json);

            callback(json)
            .then(finished => {
              console.log("saved configuration loaded := ", finished);
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

Wifi.prototype.checkConfig = function() {
  return new Promise((resolve, reject) => {
    try {
      if (fs.existsSync(STANDARD_WIFI_CONF)) {
        const config = JSON.parse(fs.readFileSync(STANDARD_WIFI_CONF, 'utf8'));
        var found = false;
        if(config.hostap && config.mode == HOSTAP) {
          if(this._mode != HOSTAP) {
            console.log("config hostap found", config.hostap);
            this.startHostAP(config.hostap)
            .then(finished => {
              console.log("start ap", finished);
              if(finished) {
                config_rows.save(KEY_AP, JSON.stringify(config.hostap))
                .then(saved => {
                  config_rows.save(KEY_MODE, HOSTAP)
                  .then(saved => {
                    resolve(true);
                  })
                  .catch(err => reject(err));
                })
                .catch(err => reject(err));
              } else {
                resolve(false);
              }
            })
            .catch(err => reject(err));
            found = true;
          } else {
            console.log("already hostap mode set");
            resolve(true);
            return;
          }
        }

        if(!found && config.wlan && config.mode == WLAN) {
          if(this._mode != WLAN) {
            console.log("config wlan found", config.wlan);
            this.startWLAN0(config.wlan)
            .then(finished => {
              if(finished) {
                config_rows.save(KEY_WLAN, JSON.stringify(config.wlan))
                .then(saved => {
                  config_rows.save(KEY_MODE, WLAN)
                  .then(saved => {
                    resolve(true);
                  })
                  .catch(err => reject(err));
                })
                .catch(err => reject(err));
              } else {
                resolve(false);
              }
            })
            .catch(err => reject(err));
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

Wifi.prototype.startHostAP = function(config) {
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

      wpa_supplicant.disable("wlan0", (err) => {
        hostapd.enable(options, (err) => {
          console.log("finished ? ", err);
          if(!err) {
            this._mode = HOSTAP;
            resolve(true);
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

Wifi.prototype.startWLAN0 = function(config) {
  return new Promise((resolve, reject) => {
    if(config && config.ssid && config.passphrase) {

      var options = {
        interface: 'wlan0',
        ssid: config.ssid,
        passphrase: config.passphrase,
        driver: "wext"
      };

      hostapd.disable('wlan0', (err) => {
        console.log(err);
        wpa_cli.add_network("wlan0", (err, res) => {
          const id = res ? res.result : undefined;
          console.log(id, err);
          if(id) {
            wpa_cli.set_network("wlan0", id, "ssid", `'"${options.ssid}"'`, (err) => {
              console.log(err);
              wpa_cli.set_network("wlan0", id, "psk", `'"${options.passphrase}"'`, (err) => {
                console.log("set network", err);
                wpa_cli.enable_network("wlan0", id, (err) => {
                  console.log("enable_network", err);
                  wpa_cli.select_network("wlan0", id, (err) => {
                    console.log("select_network", err);
                    wpa_cli.save_config("wlan0", (err, data) => {
                      console.log("save_config", err);
                      try{
                        if(!err) {
                          this._mode = WLAN;

                          wpa_supplicant.enable(options, (err) => {
                            console.log("finished ? ", err);
                          });
                        }
                      }catch(e) { console.log(e)};
                      resolve(true);
                    });
                  });
                });
              });
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

module.exports = Wifi;
