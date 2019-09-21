import { DataPointModel } from './../database/data_point';
import AbstractDevice, { Filter, OID } from "./abstract";
export default class Ellips extends AbstractDevice {
    constructor(params: any);
    getStandardFilter(): Filter;
    getConnectedStateString(item: DataPointModel | undefined): string;
    getImpactedString(item: DataPointModel | undefined): string;
    asMib(): OID[];
}
