//@ts-ignore
import network from "network";
//@ts-ignore
import config from "network-config";

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

  isGPRS() {
    return this.list().find(i => i.name === "eth1");
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