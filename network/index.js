const network = require("network");

class NetworkInfo {
  constructor() {
    setInterval(() => this._refreshNetwork(), 5000);
  }

  _refreshNetwork() {
    network.get_interfaces_list((err, list) => {
      err && console.log(err);
      this._list = list;
    });
  }

  list() {
    return this._list;
  }

  interf(interf) {
    if(this._list) {
      const filter = this._list.filter(i => i && i.name === interf);
      if(filter && filter.length > 0) return filter[0];
    }
    return undefined;
  }

  readInterface(names, key) {
    return () => new Promise(resolve => {
      var infos = names.map(i => this.interf(i)).filter(i => undefined != i);
      var info = infos.length > 0 ? infos[0] : undefined;
      var value = undefined;

      if(info) value = info[key];
      if(!value) value = "";

      resolve(value);
    })
  }
}

module.exports = new NetworkInfo();
