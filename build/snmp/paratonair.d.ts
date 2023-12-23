import AbstractDevice, { Filter, OID } from "./abstract";
import { Transaction } from '../push_web/frame_model';
export default class Paratonair extends AbstractDevice {
    constructor(params: any);
    getStandardFilter(): Filter;
    static isConnected(frame: string): boolean;
    static isStriken(frame: string): boolean;
    getConnectedStateString(compressed: string | undefined): string;
    getImpactedString(compressed: string | undefined): string;
    protected format_frame(transaction: Transaction, compressed: string): {
        d: number;
        c: boolean;
        a: boolean;
        s: boolean;
    };
    asMib(): OID[];
}
