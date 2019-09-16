/// <reference types="node" />
import { ExecException } from 'child_process';
export interface WifiConfiguration {
    ssid: string;
    passphrase: string;
}
export interface HostAPConfiguration {
    channel: number;
    hw_mode: string;
    ssid: string;
    wpa: string;
    wpa_passphrase: string;
}
interface Callback {
    (err: ExecException | null | string, stdout?: string, stderr?: string): void;
}
export default class Wifi {
    static instance: Wifi;
    _started: boolean;
    __inCheckConfig: boolean;
    _mode: string | undefined;
    _interval: NodeJS.Timeout | undefined;
    _saved_ssid: string | undefined;
    _saved_passphrase: string | undefined;
    constructor();
    removeUnwanted(string: string): string;
    saveSSID(wpa_supplicant_conf: string, ssid: string, passphrase: string, callback: Callback): any;
    start(): void;
    storeConfiguration(configuration: WifiConfiguration): Promise<boolean>;
    checkConfig(): Promise<boolean>;
    startHostAP(config: HostAPConfiguration): Promise<boolean>;
    startWLAN0(config: WifiConfiguration, save: boolean): Promise<boolean>;
}
export {};