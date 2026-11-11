export interface InterfaceState {
    name: string;
    cellular: boolean;
    operstate: string;
    ip_address?: string;
    gateway_ip?: string;
    type?: string;
}
export interface Interface {
    name: string | undefined;
    ip_address?: string | undefined;
    mac_address?: string | undefined;
    type?: string | undefined;
    netmask?: string | undefined;
    gateway_ip?: string | undefined;
}
export interface InterfaceCallback {
    (): Promise<string>;
}
export default class NetworkInfo {
    static instance: NetworkInfo;
    _list: Interface[];
    private _ready;
    constructor();
    _refreshNetwork(callback?: () => void): void;
    /**
     * Resolved once the interfaces are known, 10s at most
     */
    ready(): Promise<void>;
    list(): Interface[];
    isCellular(name: string | undefined): boolean;
    isGPRS(): boolean;
    states(): InterfaceState[];
    interf(interf: string): Interface | undefined;
    readInterface(names: string[], key: keyof Interface): InterfaceCallback;
    configure(name: string, description: any, callback: any): void;
}
