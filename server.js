const express = require("express"),
util = require("util"),
EventEmitter = require("events").EventEmitter,
basicAuth = require("basic-auth-connect"),
socketio = require("socket.io"),
app = express(),
bodyParser = require('body-parser'),
config = require("./config/visualisation.js"),
setup = require("setup")();


var port = config.port;
var server = require("http").Server(app);
var io = socketio(server);

function isValidIP(value) {
  var ip = "^((1[0-9][0-9]|1[0-9]|2[0-5][0-5]|[0-9])(\.|$)){4}$";
  return value && value.match && value.match(ip);
}

function manageNewNetworkData(data) {
  var valid = false;
  var ip = data.ip;
  var gateway = data.gateway;
  var netmask = data.netmask;
  var dns = data.dns;

  if(data) {
    if(data.dhcp === "on") {
      valid = true;
    } else {

      if(isValidIP(ip) && isValidIP(gateway)
      && isValidIP(netmask) && isValidIP(dns)) {
        valid = true;
      }
    }
  }

  if(valid) {
    var conf = {
      eth0: {
        auto: true
      }
    };

    if(data.dhcp === "on") {
      conf.eth0.dhcp = true;
    } else {
      conf.eth0.ipv4 = {
        address: ip,
        netmask: netmask,
        gateway: gateway,
        dns: dns
      }
    }

    var config = setup.network.config(conf);

    setup.network.save(config);
    console.log("saved");
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

    socket.on("new-network-state", (data) => {
      try{
        const result = manageNewNetworkData(data);

        socket.emit("network-config", result);
      } catch(e) {
        console.log(e);
        socket.emit("network-config-error", "Error while saving data");
      }
    })
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
