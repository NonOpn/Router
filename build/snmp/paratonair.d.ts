import { DataPointModel } from './../database/data_point';
import AbstractDevice, { Filter, OID } from "./abstract";
export default class Paratonair extends AbstractDevice {
    constructor(params: any);
    getStandardFilter(): Filter;
    getConnectedStateString(item: DataPointModel): string;
    getImpactedString(item: DataPointModel): string;
    asMib(): OID[];
}
