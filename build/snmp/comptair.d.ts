import { DataPointModel } from './../database/data_point';
import AbstractDevice, { Filter, OID } from "./abstract";
import { Transaction } from '../push_web/frame_model';
export default class Comptair extends AbstractDevice {
    constructor(params: any);
    getStandardFilter(): Filter;
    static isConnected(frame: string): boolean;
    static isStriken(frame: string): boolean;
    getConnectedStateString(item: DataPointModel | undefined): string;
    getImpactedString(item: DataPointModel | undefined): string;
    protected format_frame(transaction: Transaction, compressed: string): {
        d: number;
        c: boolean;
        a: boolean;
        s: boolean;
    };
    asMib(): OID[];
}
