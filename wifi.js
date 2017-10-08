var hostapd = require('wireless-tools/hostapd');
var wpa_supplicant = require('wireless-tools/wpa_supplicant');
var fs = require('fs');
config = require("./config/wifi.js");

const STANDARD_WIFI_CONF = "/media/usb/wifi.conf";

//TODO extract this hostapd into something cleaner

function Wifi() {

}

Wifi.prototype.start = function() {
  if(config.enabled && !this._started) {
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
      if(config.hostap) {
        console.log("config hostap found", config.hostap);
        this.startHostAP(config.hostap);
      } else if(config.wlan) {
        console.log("config wlan found", config.wlan);
        this.startWLAN0(config.wlan);
      }
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
      hw_mode: config.channel,
      interface: 'wlan0',
      ssid: config.ssid,
      wpa: config.wpa,
      wpa_passphrase: config.wpa_passphrase
    };

    hostapd.enable(options, (err) => {
      console.log("finished ? ", err);
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
      passphrase: config.raspberry
    };

    wpa_supplicant.enable(options, (err) => {
      console.log("finished ? ", err);
    });
  } else {
    console.log("invalid config", config);
  }
}

module.exports = Wifi;
