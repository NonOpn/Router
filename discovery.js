var dgram = require("dgram");
var config = require("./config/config");

var server = dgram.createSocket("udp4");

server.on("message", function (message, rinfo) {
  try {
    const json = JSON.parse(message);
    if(json.discover) {
      const replay = {
        service: "routair",
        data: {
          "identity": config.identity
        }
      };

      const message = new Buffer(JSON.stringify(replay));
      console.log("send replay to "+rinfo.address+" "+rinfo.port);
      server.send(message, 0, message.length, rinfo.port, rinfo.address);
    }
  } catch(e) {
    console.log(e);
  }
});

server.on("listening", function () {
  var address = server.address();
  console.log("server listening " + address.address + ":" + address.port);
});


class DiscoveryService {
  constructor() {
    this._bound = false;
  }

  bind () {
    if(!this._bound) {
      this._bound = true;
      server.bind(1732);
    }
  }
}

module.exports = DiscoveryService;
