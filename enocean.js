const SerialPort = require("serialport");
const util = require("util");
const EventEmitter = require("events").EventEmitter;
var enocean      = require("node-enocean")();
const Buffer = require("buffer").Buffer;
const uuidV4 = require('uuid/v4');
const enocean_send = require("./enocean_send.js");


EnoceanLoader = function() {
  var self = this;

  self.open_device = undefined;

  /*function sendData(device_address, data) {

}
function requestForStatus(deviceaddress, channel) {
data0 = 0xd2;
data1 = 0x03;
data2 = channel;
header = "55000a0701";
}*/
enocean.on("ready", function(){
  self.emit("usb-open", self.port);
  console.log("-");
});

enocean.on("data",function(data){
  try{
    enocean.info(data.senderId, function(sensor) {
      onLastValuesRetrieved(sensor, (sensor == undefined ? {} : undefined), data);
    });
  }catch(e){
    console.log(e)
  }
});

enocean.on("learned", function(data) {
  enocean.getSensors(function(sensors) {
    self.emit("new_learned_list", sensors);
  });
});

enocean.on("unknown-teach-in", function(data) {
  console.log("found a frame of teach in", data);
});

enocean.on("error", function(err) {
  self.checkEventClose(this);
});
enocean.on("disconnect", function(e,ee){
  self.checkEventClose(this);
});

enocean.connect("mongodb://localhost/snmp_memory");

self.checkEventClose = function(caller) {
  if(self.open_device != undefined) {
    self.emit("usb-closed", self.open_device);
    self.open_device = undefined;
  }
}

function getByte(telegram_byte_str, index) {
  return telegram_byte_str[index * 2 ] + telegram_byte_str[index * 2 + 1];
}

function getEEP(rorg, rorg_func, rorg_type) {
  return (rorg+"-"+rorg_func+"-"+rorg_type).toLowerCase();
}

function mergeJson(output, input) {
  for(var key in input) {
    output[key] = input[key];
  }
}

function isFrameToSend(rorg) {
  return ["a5", "f6", "d5", "d2", "d1"].filter(function(e) {
    return e === rorg;
  }).length > 0;
}

function onLastValuesRetrieved(sensor_data, err, data) {
  try{
    var eep = undefined;

    if(sensor_data != undefined && sensor_data.eep != undefined) {
      eep = sensor_data.eep;
    }

    if((eep != undefined) || data.rawByte.length >= (6+7)) { //at least 6 bytes for headers and 7 to have all data
      var rorg = undefined;
      if(eep == undefined) {
        rorg =  getByte(data.rawByte, 6);
        var rorg_func = getByte(data.rawByte, 6 + 6);
        var rorg_type = getByte(data.rawByte, 6 + 7);
        eep = getEEP(rorg, rorg_func, rorg_type);
      }else{
        rorg = eep.split("-")[0];
      }

      if(isFrameToSend(rorg)) {
        //var rawFrame = new Buffer(data.rawByte, "hex");
        //var rawData = new Buffer(data.raw, "hex");
        var resolved = undefined;
        enocean.eepResolvers.forEach(function(func) {
          try{
            var ret = func(eep, data.raw);
            if(ret != undefined) resolved = ret;
          }catch(e) {
            console.log(e);
          }
        });

        var output = {
          "date": new Date(),
          "guid": uuidV4(),
          "sender": data.senderId,
          "eep": eep
        }

        if(resolved != undefined) {
          output.data = resolved;
        }else{
          output.rawDataStr = data.raw;
          output.rawFrameStr = data.rawByte;
        }

        console.log(output);

        self.emit("managed_frame", output);
      }
    }
  }catch(e) {
    console.log(e);
  }
}

function getDevicesKnown(callback) {
  enocean.getSensors(function(sensors) {
    callback(sensors);
  });
}

function openDevice(port) {
  try{
    self.open_device = port;

    enocean.listen(port.comName);
  } catch(e) {

  }
}

function isARecognizedDevice(port) {
  if(port.manufacturer !== undefined) {
    var found = ["ftdi", "enocean"].filter(function(element) {
      return port.manufacturer.toLowerCase().indexOf(element) >= 0;
    });
    return found.length > 0;
  }
  return false;
}

function readDevices() {
  if(self.open_device === undefined) {
    SerialPort.list(function (err, ports) {
      ports.forEach(function(port) {
        if( isARecognizedDevice(port)) {
          openDevice(port);
        }
      });
    });
  }
}

self.register = function(item) {
  enocean.register(item);
  enocean.emitters.push(item);
  item.on("get-usb-state", function() {
    if(self.open_device == undefined) {
      item.emit("usb-state", "off");
    }else{
      item.emit("usb-state", "on");
    }
  })
}

setInterval(function() {
  readDevices()
}, 2000);

self.register(self);

};

util.inherits(EnoceanLoader, EventEmitter);

module.exports = EnoceanLoader;
