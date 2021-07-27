import { DataPointModel } from './../database/data_point';
import AbstractDevice, { Filter, OID } from "./abstract";
import { Transaction } from '../push_web/frame_model';
export default class Ellips extends AbstractDevice {
    constructor(params: any);
    getStandardFilter(): Filter;
    getConnectedStateString(item: DataPointModel | undefined): string;
    getImpactedString(item: DataPointModel | undefined): string;
    protected format_frame(transaction: Transaction, compressed: string): {
        d: number;
        s: boolean;
    };
    asMib(): OID[];
}
