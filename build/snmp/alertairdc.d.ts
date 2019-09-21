import AbstractDevice, { Filter, OID } from "./abstract";
import { DataPointModel } from "../database/data_point";
export default class AlertairDC extends AbstractDevice {
    constructor(params: any);
    getStandardFilter(): Filter;
    getConnectedStateString(item: DataPointModel | undefined): string;
    getImpactedString(item: DataPointModel | undefined): string;
    asMib(): OID[];
}
