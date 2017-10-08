const DataPoint = require("../database/data_point");
const snmp = require('snmpjs');

function Abstract() {
  this.agent = undefined;
  this.params = undefined;
}

Abstract.prototype.setParams = function(params) {
  this.params = params;
  this.agent = snmp.createAgent();
  this.agent.request(this.asMib());
  this.snmp = snmp;
  this.data_point_provider = new DataPoint();
}

Abstract.prototype.getLPSFR = function() {
  return this.params.lpsfr;
}

Abstract.prototype.asMib = function() {
  throw "must be defined";
}

Abstract.prototype.getLatest = function() {
  return this.data_point_provider.findLatestWithParams(this.getStandardFilter());
}

Abstract.prototype.getStandardFilter = function() {
  throw "must be defined";
}

Abstract.prototype.sendString = function(prq, string) {
  if(!string || string.length === 0) string = " ";
  var val = snmp.data.createData({
    type: "OctetString",
    value: string
  });

  snmp.provider.readOnlyScalar(prq, val);
}

Abstract.prototype.bind = function() {
  if(this.agent) {
    console.log("bind done", this.params.port);
    this.agent.bind({ family: 'udp4', port: this.params.port });
  }
}

module.exports = Abstract;
