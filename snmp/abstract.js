const DataPoint = require("../database/data_point");
const snmp = require('snmpjs');

class Abstract {
  constructor() {
    this.agent = undefined;
    this.params = undefined;
  }

  setParams(params) {
    this.params = params;
    if(!this.params.no_snmp) {
      this.agent = snmp.createAgent();
      this.agent.request(this.asMib());
    }
    this.snmp = snmp;
    this.data_point_provider = new DataPoint();
  }

  getId() {
    const lpsfr = this.getLPSFR();
    if(lpsfr && lpsfr.id) return lpsfr.id;
    return 0;
  }

  getUUID() {
    var uuid = this.getId().toString(16);
    if(uuid.length) while(uuid.length < 4) uuid="0"+uuid;
    return uuid;
  }

  getSerial() {
    return this._getPromiseCharacteristic("serial");
  }

  getInternalSerial() {
    return this._getPromiseCharacteristic("internal");
  }

  getType() {
    return this._getPromiseCharacteristic("type");
  }

  _getPromiseCharacteristic(name) {
    return new Promise((resolve, reject) => {
      if(this.params && this.params.lpsfr) resolve(this.params.lpsfr[name]);
      else resolve("");
    })
  }


  getConnectedStateString(item) {
    return "not_implemented";
  }

  getImpactedString(item) {
    return "not_implemented";
  }

  getLPSFR() {
    return this.params.lpsfr;
  }

  getLatest() {
    return this.data_point_provider.findLatestWithParams(this.getStandardFilter());
  }

  getConnectedState() {
    return this.getLatest()
    .then(item => this.getConnectedStateString(item));
  }

  getImpactedState() {
    return this.getLatest()
    .then(item => this.getImpactedString(item));
  }

  getStandardFilter() { throw "must be defined"; }

  asMib() { throw "must be defined" }

  sendString(prq, string) {
    if(!string || string.length === 0) string = " ";
    var val = snmp.data.createData({
      type: "OctetString",
      value: string
    });

    snmp.provider.readOnlyScalar(prq, val);
  }

  bind() {
    if(this.agent) {
      console.log("bind done", this.params.port);
      this.agent.bind({ family: 'udp4', port: this.params.port });
    }
  }
}

module.exports = Abstract;
