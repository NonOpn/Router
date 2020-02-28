import express from "express";
import { EventEmitter } from "events";
import socketio from "socket.io";
import Setup from "setup";
import api_v1 from "./server/api/api_v1";
import api_public from "./server/api/api_public";
import bodyParser from 'body-parser';
import config from "./config/visualisation.js";

import Wifi from "./wifi/wifi";
import EnoceanLoader from "./enocean";

const app = express();
const setup = Setup();
const wifi = Wifi.instance;

var port = config.port;
var server = require("http").Server(app);
var io = socketio(server);

function isValidIP(value: any) {
  var ip = "^((1[0-9][0-9]|1[0-9]|2[0-5][0-5]|[0-9])(\.|$)){4}$";
  return value && value.match && value.match(ip);
}

function isValidIPs(array: any) {
  return array.filter((value: any) => {
    return !isValidIP(value);
  }).length == 0;
}

function manageNewNetworkData(intface: any, data: any) {
  var valid = false;
  var ip = data.ip;
  var gateway = data.gateway;
  var netmask = data.netmask;
  var dns = data.dns;

  const network: any = {
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

    var conf: any = {
      /* eth0 or wlan0 */
    };

    if(intface == "eth0") {
      conf.eth0 = network;
    } else if(intface == "wlan0") {
      conf.wlan0 = network;
    }

    var config = setup.network.config(conf);

    setup.network.save(config);
    return true;
  }
  return false;
}


export default class Server extends EventEmitter  {
  enocean_manager: EnoceanLoader;

  constructor(enocean_manager: EnoceanLoader) {
    super();

    this.enocean_manager = enocean_manager;

    io.on("connection", function (socket: any){
      enocean_manager.register(socket);

      const net = (type: any, data: any) => {
        try{
          const result = manageNewNetworkData(type, data);
          socket.emit("network-config", result);
        } catch(e) {
          console.log(e);
          socket.emit("network-config-error", "Error while saving data");
        }
      }

      socket.on("new-network-wifi-conf", (network: any) => {
        //{ssid: //, psk: //}
        if(network && network.ssid && network.passphrase) {
          wifi.storeConfiguration(network)
          .then((success: boolean) => {
            if(success === true) {
              socket.emit("network-config-error-wifi", "Configuration saved. Please wait 1min for it to activate");
            } else {
              socket.emit("network-config-error-wifi", "Error while configuring the network data");
            }
          })
        } else {
          socket.emit("network-config-error-wifi", "Error with wifi information");
        }
      });

      socket.on("new-network-state-wlan0", (data: any) => {
        net("wlan0", data);
      });

      socket.on("new-network-state-eth0", (data: any) => {
        net("eth0", data);
      });
    });

    io.on("network_conf", function(socket: any) {
      console.log()
    });


    this.on("usb-closed", function(){
      io.sockets.emit("usb-closed");
    });

    this.on("usb-open", function(){
      io.sockets.emit("usb-open");
    });
  }


  start() {
    app
    .use(bodyParser.json())
    .use("/api/public", api_public)
    //.use(basicAuth(config.login, config.password))
    .use("/api/v1", api_v1)
    .use(express.static("./server/html"));

    server.listen(port);
  }

  onFrame(frame: any) {
    io.sockets.emit("managed_frame", {data: frame});
  }
}