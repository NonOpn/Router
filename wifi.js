var hostapd = require('wireless-tools/hostapd');
var wpa_supplicant = require('wireless-tools/wpa_supplicant');
var fs = require('fs');
config = require("./config/wifi.js");
var wpa_cli = require('wireless-tools/wpa_cli');

const NONE = "none";
const HOSTAP = "hostap";
const WLAN = "wlan";

const STANDARD_WIFI_CONF = "/media/usb/wifi.conf";

//TODO extract this hostapd into something cleaner

function Wifi() {

}

Wifi.prototype.start = function() {
  if(config.enabled && !this._started) {
    this._mode = NONE;
    this._started = true;

    this._interval = setInterval(() => {
      this.checkConfig();
    }, 5000);
  } else if(!config.enabled) {
    console.log("wifi listener not started");
  }
}

Wifi.prototype.checkConfig = function() {
  try {
    if (fs.existsSync(STANDARD_WIFI_CONF)) {
      const config = JSON.parse(fs.readFileSync(STANDARD_WIFI_CONF, 'utf8'));
      var found = false;
      if(config.hostap) {
        if(this._mode != HOSTAP) {
          console.log("config hostap found", config.hostap);
          this.startHostAP(config.hostap);
          found = true;
        } else {
          console.log("already hostap mode set");
        }
      }

      console
      if(!found && config.wlan) {
        if(this._mode != WLAN) {
          console.log("config wlan found", config.wlan);
          this.startWLAN0(config.wlan);
        } else {
          console.log("already wifi mode set");
        }
      }
    } else {
      this._mode = NONE;
    }
  } catch (err) {
    console.log(err);
  }
}

Wifi.prototype.startHostAP = function(config) {
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

    hostapd.enable(options, (err) => {
      console.log("finished ? ", err);
      if(!err) {
        this._mode = HOSTAP;
      }
    })
  } else {
    console.log("invalid config", config);
  }
}

Wifi.prototype.startWLAN0 = function(config) {
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
              console.log(err);
              wpa_cli.enable_network("wlan0", id, (err) => {
                wpa_cli.select_network("wlan0", id, (err) => {
                  wpa_cli.save_config('wlan0', (err, data) => {
                    wpa_supplicant.enable(options, (err) => {
                      console.log("finished ? ", err);
                      if(!err) {
                        this._mode = WLAN;
                      }
                    });
                  });
                });
              });
            });
          });
        }
      });
    });
  } else {
    console.log("invalid config", config);
  }
}

module.exports = Wifi;
