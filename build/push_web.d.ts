/// <reference types="node" />
import { EventEmitter } from "events";
import AbstractDevice from "./snmp/abstract";
export default class PushWEB extends EventEmitter {
    private is_activated;
    private _posting;
    private _number_to_skip;
    private _protection_network;
    private memory_transactions;
    constructor();
    log(data: any): void;
    trySend(): void;
    trySendOk: () => Promise<void>;
    private setSent;
    sendEcho: () => Promise<void>;
    onFrame(device: AbstractDevice | undefined, data: any): void;
    private _started;
    connect(): void;
    private applyData;
}
