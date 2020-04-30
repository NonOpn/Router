export interface Interface {
    name: string | undefined;
    ip_address?: string | undefined;
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
    readInterface(names: string[], key: string): InterfaceCallback;
    configure(name: string, description: any, callback: any): void;
}
