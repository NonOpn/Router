/// <reference types="node" />
import { EventEmitter } from "events";
import AbstractDevice from "./snmp/abstract";
export default class PushWEB extends EventEmitter {
    is_activated: boolean;
    _posting: boolean;
    _number_to_skip: number;
    _protection_network: number;
    constructor();
    log(data: any): void;
    trySend(): void;
    trySendOk: () => Promise<void>;
    private setSent;
    sendEcho: () => Promise<void>;
    onFrame(device: AbstractDevice | undefined, data: any): void;
    private _started;
    connect(): void;
    applyData(device: AbstractDevice | undefined, data: any): void;
}
