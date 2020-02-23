import AbstractDevice, { Filter, OID } from "./abstract";
import { DataPointModel } from "../database/data_point";
export default class AlertairDC extends AbstractDevice {
    constructor(params: any);
    getStandardFilter(): Filter;
    static isConnected(frame: string): boolean;
    static isCircuitDisconnect(frame: string): boolean;
    getConnectedStateString(item: DataPointModel | undefined): string;
    getImpactedString(item: DataPointModel | undefined): string;
    getFormattedLatestFrames(): Promise<any[]>;
    asMib(): OID[];
}
