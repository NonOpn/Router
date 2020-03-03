/// <reference types="node" />
import { EventEmitter } from "events";
import { MqttClient } from "mqtt";
export default class MQTT extends EventEmitter {
    client: MqttClient | undefined;
    connect(): void;
    onFrame(data: any): void;
}
