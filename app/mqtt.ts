import { EventEmitter } from "events";

import mqtt, { MqttClient } from "mqtt";
import config from "../config/mqtt.json";

export default class MQTT extends EventEmitter {
  client: MqttClient |undefined;

  connect() {
    if(mqtt/*.mqtt*/) {
      try{
        this.client = mqtt.connect(config.mqtt_address, {
          username:config.mqtt_login,
          password:config.mqtt_password,
          reconnectPeriod: 10000
        });

        this.client.on("socket", (socket: any) => {
          console.log(socket);
        });

        this.client.on("error", (e) => {
          console.log(e);
        });

        this.client.on('connect', () => {
          console.log("connected");
          this.client && this.client.publish("router/connect", JSON.stringify({
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

  onFrame(data: any) {
    console.log("having frame to send to mqtt");
    try {
      this.client && this.client.publish("router/raw", JSON.stringify(data), { "qos": 2 });
    } catch(e) {
      console.log(e);
    }
  }
}