const bleno = require("bleno");

const devices = require("./push_web/device_model");
const config = require("./config/config");
const visualisation = require("./config/visualisation");
const PrimaryService = bleno.PrimaryService;
const Characteristic = bleno.Characteristic;
const Descriptor = bleno.Descriptor;
const wifi = require("./wifi/instance.js");


var id = "Routair";
if(config.identity && config.identity.length >= 5 * 2) { //0xAABBCCDD
  id += config.identity.substr(0, 5 * 2);
}

class BLEDescriptionCharacteristic extends Characteristic {
  constructor(uuid, value) {
    super({
      uuid: uuid,
      properties: ['read'],
      value: Buffer.from(value, 'utf-8')
    });

    this._value = Buffer.from(value, "utf-8");
  }

  onReadRequest(offset, cb) { cb(this.RESULT_SUCCESS, this._value) }
}


class BLEFrameNotify extends Characteristic {
  constructor(uuid, value) {
    super({
      uuid: uuid,
      properties: ['notify']
    });

    this._value = Buffer.from(value, "utf-8");
  }


  onSubscribe(maxValueSize, callback) { this._updateFramesCallback = callback; }

  onUnsubscribe() { this._updateFramesCallback = null; }

  onFrame(frame) {
    console.log("sending frame, having notify ?", (null != this._updateFramesCallback));
    if(this._updateFramesCallback) {
      this._updateFramesCallback(Buffer.from(frame.rawFrameStr, "utf-8"));
    }
  }
}

class BLEWriteCharacteristic extends Characteristic {
  constructor(uuid, value, onValueRead) {
    super({
      uuid: uuid,
      properties: [ 'write' ],
      //secure: [ 'write' ]
    });

    if(onValueRead) this._onValueRead = onValueRead;
    else this._onValueRead = () => {};
  }

  onWriteRequest(data, offset, withoutResponse, callback) {
    console.log('WiFiBle - onWriteRequest: value = ', data);
    var p = undefined;
    if(data) p = this._onValueRead(data.toString());
    else p = new Promise((r) => r());

    p.then(result => {
      console.log("write set ", result);
      callback(this.RESULT_SUCCESS)
    });
  };
}

class BLEPrimaryService extends PrimaryService {

  constructor(characteristics) {
    super({
      uuid: 'bee5',
      characteristics: characteristics
    });
  }
}

class BLEPrimaryServiceDevice extends PrimaryService {
  constructor(device, characteristics) {
    super({
      uuid: device.serial,
      characteristics: [
        new BLEDescriptionCharacteristic("0001", config.identity),
        new BLEDescriptionCharacteristic("0002", config.version)
      ]
    });
  }
}

class BLE {

  constructor() {
    this._notify_frame = new BLEFrameNotify("0102", "Notify");

    this._characteristics = [
      new BLEDescriptionCharacteristic("0001", config.identity),
      new BLEDescriptionCharacteristic("0002", config.version),
      new BLEWriteCharacteristic("0101", "Wifi Config", (value) => this._onWifi(value)),
      new BLEWriteCharacteristic("0102", "Network Config", (value) => this._onNetwork(value)),
      this._notify_frame
    ];

    this._ble_service = new BLEPrimaryService(this._characteristics);

    this._started_advertising = false;
    this._started = false;
  }

  start() {
    setTimeout(() => this.startDelayed(), 1000);
  }

  startDelayed() {
    if(this._started) return;

    this._started = true;
    bleno.on('stateChange', (state) => {
      console.log('on -> stateChange: ' + state);

      if (state == 'poweredOn' && !this._started_advertising) {
        this._started_advertising = true;
        console.log("starting advertising for", this._ble_service.uuid);

        devices.list()
        .then(devices => {
          console.log("devices", devices);
          bleno.startAdvertising(id, [this._ble_service.uuid ]);
        })
        .catch(err => {
          console.error(err);
          bleno.startAdvertising(id, [this._ble_service.uuid ]);
        })
      } else if(this._started_advertising) {
        this._started_advertising = false;
        console.log("stopping ", state)
        bleno.stopAdvertising();
      }
    });


    bleno.on('advertisingStart', (err) => {
      console.log('on -> advertisingStart: ' + (err ? 'error ' + err : 'success'));

      if (!err && this._started_advertising) {
        bleno.setServices( [ this._ble_service ], (err) => {
          console.log('setServices: '  + (err ? 'error ' + err : 'success'));
        });
      }
    });

    bleno.on("disconnect", (client) => {
      console.log("disconnect : client ->", client);
    });
  }

  onFrame(frame) {
    console.log("sending frame");
    this._notify_frame.onFrame(frame);
  }

  json(value) {
    var json = {};
    try {
      json = JSON.parse(value);
    } catch (e) {
      console.error(e);
    }
    return json;
  }

  _onNetwork(value) {
    var j = undefined;
    const tmp = this.json(value);
    var net_interface = null;

    if(tmp.password === visualisation.password && tmp.ssid && tmp.passphrase) {
      console.log("configuration valid found, saving it");
      if(tmp.interface) {
        if("eth0" == tmp.interface) {
          net_interface = "eth0";
        } else if("wlan0" == tmp.interface) {
          net_interface = "wlan0";
        }
      }

      if(tmp.ip && tmp.netmask && tmp.broadcast && tmp.gateway) {
        j = { ip: tmp.ip, netmask: tmp.netmask, broadcast: tmp.broadcast, gateway: tmp.gateway };
      } else if(tmp.dhcp) {
        j = { dhcp: true, restart: true};
      }
    }

    network.configure(net_interface, j, (err) => {
      console.log("set network info");
      console.log(err);
    });
  }

  _onWifi(value) {
    var json = undefined;
    const tmp = this.json(value);

    if(tmp.password === visualisation.password && tmp.ssid && tmp.passphrase) {
      console.log("configuration valid found, saving it");
      json = { ssid: tmp.ssid, passphrase: tmp.passphrase };
    }

    if(!json) return new Promise((r) => r());
    return wifi.storeConfiguration(json)
    .then(success => {
      if(success === true) {
        console.log("configuration saved");
      } else {
        console.log("error while saving");
      }
      return success;
    }).catch(err => {
      console.log("error while saving", err);
      return false;
    });
  }
}

module.exports = BLE;
