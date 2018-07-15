var fs = require("fs");
var EnoceanLoader = require("./enocean.js");
var Server = require("./server.js");
var BLE = require("./ble");
var SNMP = require("./snmp.js");
var PushWEB = require("./push_web.js");
var DiscoveryService = require("./discovery");
var request = require('request');
var wifi = require("./wifi/instance.js");
var errors = require("./errors");

console.log("starting routair main program...");

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log("MASTER STARTED");
  cluster.fork();

  cluster.on('disconnect', (worker) => {
    console.error('disconnect!');
    cluster.fork();
  });

} else {

  const domain = require('domain');
  const created_domain = domain.create();

  process.on("uncaughtException", (err) => {
    console.log("oups", err);
  });

  created_domain.on('error', (er) => {

    const qSilent = () => {
      setTimeout(() => {
        try {
          // make sure we close down within 30 seconds
          const killtimer = setTimeout(() => {
            process.exit(1);
          }, 30000);
          // But don't keep the process open just for that!
          killtimer.unref();
          cluster.worker.disconnect();
        } catch (er2) {
        }
      }, 30000);
    }

    try {
      console.log(er);
      errors.postJsonErrorPromise(er)
      .then(val => {
        console.log("post done, quit");
        qSilent();
      })
      .catch(err => {
        console.log("post error, quit");
        qSilent();
      })
    } catch(e) {
      console.log("error error, quit", e);
      qSilent();
    }
  });

  created_domain.run(() => {
    var enocean = new EnoceanLoader();
    var server = new Server(enocean);
    var snmp = new SNMP();
    var push_web = new PushWEB();
    var discovery_service = new DiscoveryService();
    var ble = new BLE();

    wifi.start();
    server.start();
    snmp.connect();
    push_web.connect();
    enocean.register(server);
    discovery_service.bind();
    ble.start();

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
  });
}
