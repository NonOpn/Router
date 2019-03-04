import AbstractDevice, { Filter, OID } from "./abstract";
export default class AlertairDC extends AbstractDevice {
    constructor(params: any);
    getStandardFilter(): Filter;
    getConnectedStateString(item: any): string;
    getImpactedString(item: any): string;
    asMib(): OID[];
}
