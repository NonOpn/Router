const DataPoint = require("../database/data_point");
const snmp = require('snmpjs');

class Abstract {
  constructor() {
    this.agent = undefined;
    this.params = undefined;
  }

  setParams(params) {
    this.params = params;
    this.agent = snmp.createAgent();
    this.agent.request(this.asMib());
    this.snmp = snmp;
    this.data_point_provider = new DataPoint();
  }

  getLPSFR() {
    return this.params.lpsfr;
  }

  asMib() { throw "must be defined" }

  getLatest() {
    return this.data_point_provider.findLatestWithParams(this.getStandardFilter());
  }

  getStandardFilter() { throw "must be defined"; }

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
