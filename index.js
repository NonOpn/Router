var fs = require("fs");
var EnoceanLoader = require("./enocean.js");
var Server = require("./server.js");
var SNMP = require("./snmp.js");
var PushWEB = require("./push_web.js");
var request = require('request');
var wifi = require("./wifi/instance.js");

var enocean = new EnoceanLoader();
var server = new Server(enocean);
var snmp = new SNMP();
var push_web = new PushWEB();

wifi.start();
server.start();
snmp.connect();
push_web.connect();
enocean.register(server);

enocean.on("usb-open", function(port) {
  console.log("device opened and ready");
  server.emit("usb-open");
});

enocean.on("usb-closed", function(port_instantiated) {
  console.log("device removed");
  server.emit("usb-closed");
});

enocean.on("managed_frame", function(frame) {
  server.onFrame(frame);
  snmp.onFrame(frame);
  push_web.onFrame(frame);
});

enocean.on("frame", function(frame) {
});

snmp.on("log", function(log) {
	server.emit("log", log);
});

process.on("uncaughtException", function(err) {
  try{
    if(err && err.toString().indexOf("Device not configured") >= 0) {
      enocean.emit("close");
    }
  }catch(e){

  }
});
