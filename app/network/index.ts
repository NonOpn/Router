//@ts-ignore
import network from "network";
//@ts-ignore
import config from "network-config";
import fs from "fs";

// the Huawei modem (12d1:1f01 switched by usb_modeswitch) is exposed as eth1 on older kernels
// and usb0 on newer ones ; wwan0 / ppp0 for qmi or ppp based modems
const CELLULAR_INTERFACES = ["eth1", "usb0", "wwan0", "ppp0"];

export interface InterfaceState {
  name: string;
  cellular: boolean;
  operstate: string;
  ip_address?: string;
  gateway_ip?: string;
  type?: string;
}

export interface Interface {
  name: string|undefined;
  ip_address?: string|undefined;
  mac_address?: string|undefined;
  type?: string|undefined;
  netmask?: string|undefined;
  gateway_ip?: string|undefined;
}

export interface InterfaceCallback {
  (): Promise<string>;
}

export default class NetworkInfo {
  static instance: NetworkInfo = new NetworkInfo();
  _list: Interface[];

  constructor() {
    this._list = [];
    setInterval(() => this._refreshNetwork(), 5000);
  }

  _refreshNetwork(): void {
    network.get_interfaces_list((err: Error, list: Interface[]|undefined) => {
      err && console.log(err);
      this._list = list || [];
    });
  }

  list(): Interface[] {
    return (this._list || []).filter(i => !!i);
  }

  isCellular(name: string|undefined): boolean {
    return !!name && CELLULAR_INTERFACES.indexOf(name) >= 0;
  }

  isGPRS(): boolean {
    return !!this.list().find(i => this.isCellular(i.name));
  }

  // wlan0 can be up for the "local wifi" mode, the operstate & gateway tells which one is really used
  states(): InterfaceState[] {
    return this.list().map(i => {
      const name = i.name || "";
      var operstate = "unknown";
      try {
        operstate = fs.readFileSync(`/sys/class/net/${name}/operstate`).toString().trim();
      } catch(e) {

      }
      return {
        name,
        cellular: this.isCellular(name),
        operstate,
        ip_address: i.ip_address || undefined,
        gateway_ip: i.gateway_ip || undefined,
        type: i.type || undefined
      };
    });
  }

  interf(interf: string): Interface|undefined {
    if(this._list) {
      const filter = this._list.filter(i => i && i.name === interf);
      if(filter && filter.length > 0) return filter[0];
    }
    return undefined;
  }

  readInterface(names: string[], key: keyof Interface): InterfaceCallback {
    return () => new Promise(resolve => {
      var infos = names.map(i => this.interf(i)).filter(i => undefined != i);
      var info = infos.length > 0 ? infos[0] : undefined;
      var value = undefined;

      if(info) value = info[key];
      if(!value) value = "";

      resolve(value);
    })
  }

  configure(name: string, description: any, callback: any) {
    config.configure(name, description, callback);
  }
}