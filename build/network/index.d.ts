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
    constructor();
    _refreshNetwork(): void;
    list(): Interface[];
    isGPRS(): Interface | undefined;
    interf(interf: string): Interface | undefined;
    readInterface(names: string[], key: keyof Interface): InterfaceCallback;
    configure(name: string, description: any, callback: any): void;
}
