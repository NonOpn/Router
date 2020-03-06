/// <reference types="node" />
import { EventEmitter } from "events";
import AbstractDevice from "./snmp/abstract.js";
export default class PushWEB extends EventEmitter {
    is_activated: boolean;
    _posting: boolean;
    constructor();
    trySend(): void;
    sendEcho(): void;
    onFrame(device: AbstractDevice | undefined, data: any): void;
    private _started;
    connect(): void;
    applyData(device: AbstractDevice | undefined, data: any): void;
}
