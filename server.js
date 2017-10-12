const express = require("express"),
util = require("util"),
EventEmitter = require("events").EventEmitter,
basicAuth = require("basic-auth-connect"),
socketio = require("socket.io"),
app = express(),
bodyParser = require('body-parser'),
config = require("./config/visualisation.js"),
setup = require("setup")(),
wifi = require("./wifi/instance.js");


var port = config.port;
var server = require("http").Server(app);
var io = socketio(server);

function isValidIP(value) {
  var ip = "^((1[0-9][0-9]|1[0-9]|2[0-5][0-5]|[0-9])(\.|$)){4}$";
  return value && value.match && value.match(ip);
}

function isValidIPs(array) {
  return array.filter(value => {
    return !isValidIP(value);
  }).length == 0;
}

function manageNewNetworkData(intface, data) {
  var valid = false;
  var ip = data.ip;
  var gateway = data.gateway;
  var netmask = data.netmask;
  var dns = data.dns;

  const network = {
    auto: true
  }

  if(data) {
    valid = data.dhcp === "on" || isValidIPs([ip, gateway, netmask, dns]);
  }

  if(valid) {
    if(data.dhcp === "on") {
      network.dhcp = true;
    } else {
      network.ipv4 = {
        address: ip,
        netmask: netmask,
        gateway: gateway,
        dns: dns
      }
    }

    var conf = {
      /* eth0 or wlan0 */
    };

    if(intface == "eth0") {
      conf.eth0 = network;
    } else if(intface == "wlan0") {
      conf.wlan0 = network;
    }

    var config = setup.network.config(conf);

    setup.network.save(config);
    console.log("saved", config);
    return true;
  }
  return false;
}


var Server = function(enocean_manager) {
  var self = this;
  var known_devices = [];

  this.start = function() {
    app
    .use(basicAuth(config.login, config.password))
    .use(bodyParser.json())
    .use(express.static("./server/html"));

    server.listen(port);
  }

  io.on("connection", function (socket){
    enocean_manager.register(socket);

    const net = (type, data) => {
      try{
        const result = manageNewNetworkData(type, data);
        socket.emit("network-config", result);
      } catch(e) {
        console.log(e);
        socket.emit("network-config-error", "Error while saving data");
      }
    }

    socket.on("new-network-wifi-conf", (network) => {
      //{ssid: //, psk: //}
      if(network && network.ssid && network.passphrase) {
        wifi.storeConfiguration(network)
        .then(success => {
          socket.emit("network-config-error-wifi", success);
        })
      } else {
        socket.emit("network-config-error-wifi", "Error with wifi information");
      }
    });

    socket.on("new-network-state-wlan0", (data) => {
      net("wlan0", data);
    });

    socket.on("new-network-state-eth0", (data) => {
      net("eth0", data);
    });
  });

  io.on("network_conf", function(socket) {
    console.log()
  });


  self.on("usb-closed", function(){
    io.sockets.emit("usb-closed");
  });

  self.on("usb-open", function(){
    io.sockets.emit("usb-open");
  });

  this.onFrame = function(frame) {
    io.sockets.emit("managed_frame", {data: frame});
  }
}

util.inherits(Server, EventEmitter);

module.exports = Server;
