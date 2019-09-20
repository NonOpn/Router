/// <reference types="node" />
import { EventEmitter } from "events";
import EnoceanLoader from "./enocean";
export default class Server extends EventEmitter {
    enocean_manager: EnoceanLoader;
    constructor(enocean_manager: EnoceanLoader);
    start(): void;
    onFrame(frame: any): void;
}
