const EventEmitter = require("events").EventEmitter;
const util = require("util");
const mqtt = require("mqtt");
const config = require("./config/mqtt.json");


var MQTT = function() {
  //var client = mqtt.connect("mqtts://mqtt.nonopn.cloud:1884");
  var client = undefined;

  this.connect = function() {
    if(mqtt.mqtt) {
      try{
        client = mqtt.connect(config.mqtt_address, {
          username:config.mqtt_login,
          password:config.mqtt_password,
          reconnectPeriod: 10000
        });

        client.on("socket", function(socket) {
          console.log(socket);
        });

        client.on("error", function(e) {
          console.log(e);
        });

        client.on('connect', function() {
          console.log("connected");
          client.publish("router/connect", JSON.stringify({
            "router": "debug"
          }))
        });
      }catch(e){
        console.log(e);
      }
    } else {
      console.log("mqtt disabled");
    }
  }

  this.onFrame = function(data) {
    console.log("having frame to send to mqtt");
    try {
      if(client != undefined) {
        client.publish("router/raw", JSON.stringify(data),
        {
          "qos": 2
        });
      }
    } catch(e) {
      console.log(e);
    }
  }
}

util.inherits(MQTT, EventEmitter);

module.exports = MQTT;
