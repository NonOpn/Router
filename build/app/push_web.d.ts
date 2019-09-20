/// <reference types="node" />
import { EventEmitter } from "events";
export default class PushWEB extends EventEmitter {
    is_activated: boolean;
    _posting: boolean;
    constructor();
    trySend(): void;
    sendEcho(): void;
    onFrame(data: any): void;
    connect(): void;
    applyData(data: any): void;
}
