/// <reference types="node" />
import { EventEmitter } from "events";
import DataPoint from "./database/data_point";
export default class SNMP extends EventEmitter {
    agents: any[];
    agent: any;
    data_point_provider: DataPoint;
    constructor();
    onFrame(data: any): void;
    applyData(data: any): void;
    connect(): void;
}
