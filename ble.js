const bleno = require("bleno");

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


  onReadRequest(offset, callback) {
    callback(this.RESULT_SUCCESS, this._value);
  }
}


class BLEFrameNotify extends Characteristic {
  constructor(uuid, value) {
    super({
      uuid: uuid,
      properties: ['notify']
    });

    this._value = Buffer.from(value, "utf-8");
  }


  onSubscribe(maxValueSize, updateFramesCallback) {
    this._updateFramesCallback = updateFramesCallback;
  }

  onUnsubscribe() {
    this._updateFramesCallback = null;
  }

  onFrame(frame) {
    console.log("sending frame, having notify ?", (null != this._updateFramesCallback));
    if(this._updateFramesCallback) {
      this._updateFramesCallback(Buffer.from(frame.rawFrameStr, "utf-8"));
    }
  }
}

class BLEWifiCharacteristic extends Characteristic {
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

    p.then(() => callback(this.RESULT_SUCCESS));
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

class BLE {

  constructor() {

    this._notify_frame = new BLEFrameNotify("0102", "Notify");

    this._characteristics = [
      new BLEDescriptionCharacteristic("0001", config.identity),
      new BLEDescriptionCharacteristic("0002", config.version),
      new BLEWifiCharacteristic("0101", "Wifi Config", (value) => this._onWifi(value)),
      this._notify_frame
    ];

    this._ble_service = new BLEPrimaryService(this._characteristics);

    this._started_advertising = false;
    this._started = false;
  }

  start() {
    if(this._started) return;

    this._started = true;
    bleno.on('stateChange', (state) => {
      console.log('on -> stateChange: ' + state);

      if (state == 'poweredOn' && !this._started_advertising) {
        this._started_advertising = true;
        console.log("starting advertising for", this._ble_service.uuid);
        bleno.startAdvertising(id, [this._ble_service.uuid]);
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
  }

  onFrame(frame) {
    console.log("sending frame");
    this._notify_frame.onFrame(frame);
  }

  _onWifi(value) {
    var json = undefined;
    try {
      const tmp = JSON.parse(value);

      if(tmp.password === visualisation.password && tmp.ssid && tmp.passphrase) {
        console.log("configuration valid found, saving it");
        json = { ssid: tmp.ssid, passphrase: tmp.passphrase };
      }
    } catch (e) {
      json = undefined;
    }

    if(!json) return new Promise((r) => r());
    return wifi.storeConfiguration(json)
    .then(success => {
      if(success === true) {
        res.json({
          result: "configuration saved"
        });
      } else {
        res.json({
          error: "error while saving"
        });
      }
    }).catch(err => {
      console.log(err);
      res.json({
        error: "error while saving"
      });
    });
  }
}

module.exports = BLE;
