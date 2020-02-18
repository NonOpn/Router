import { DataPointModel } from './../database/data_point';
import AbstractDevice, { Filter, OID } from "./abstract";
export default class Comptair extends AbstractDevice {
    constructor(params: any);
    getStandardFilter(): Filter;
    static isConnected(frame: string): boolean;
    static isStriken(frame: string): boolean;
    getConnectedStateString(item: DataPointModel | undefined): string;
    getImpactedString(item: DataPointModel | undefined): string;
    asMib(): OID[];
}
