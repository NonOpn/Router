export interface Space {
    free: number;
    size: number;
    used: number;
    percent: number;
}
export default class Diskspace {
    private du;
    static instance: Diskspace;
    constructor();
    diskspace(): Promise<Space>;
    usage(): Promise<string>;
}
