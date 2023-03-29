/// <reference types="node" />
import { EventEmitter } from "events";
import AbstractDevice from "./snmp/abstract";
import EnoceanLoader from "./enocean";
export default class PushWEB extends EventEmitter {
    private enocean;
    private _posting;
    private _number_to_skip;
    private _protection_network;
    private memory_transactions;
    constructor(enocean: EnoceanLoader);
    log(data: any): void;
    trySend: () => Promise<void>;
    trySendOk: () => Promise<void>;
    private setSent;
    private lastRequestGPRSCount;
    private sendEcho;
    onFrame(device: AbstractDevice | undefined, data: any): void;
    connect(): void;
    private applyData;
}
