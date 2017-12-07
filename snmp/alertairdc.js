const Abstract = require("./abstract"),
util = require("util"),
os = require('os');

//TODO refactor the classes since not lot of differences
function AlertairDC(params) {
  this.setParams(params);
}

AlertairDC.prototype.getStandardFilter = function() {
  return {
    serial: this.params.lpsfr.serial
  };
}


AlertairDC.prototype.getConnectedStateString = function(item) {
  if(!item || !item.data) return " ";
  const buffer = new Buffer(item.data, "hex");
  if(buffer.length >= 16) {
    const disconnect = (buffer[9] & 2) === 2;
    if(disconnect) return "disconnect";
  }
  return "connected";
}

AlertairDC.prototype.getImpactedString = function(item) {
  if(!item || !item.data) return " ";
  const buffer = new Buffer(item.data, "hex");
  if(buffer.length >= 16) {
    const disconnect = (buffer[9] & 1) === 0;
    if(disconnect) return "circuit_disconnect";
  }
  return "circuit_normal";
}

AlertairDC.prototype.asMib = function() {
  return [
    {
      oid: this.params.oid+".1",
      handler: (prq) => {
        this.sendString(prq, this.params.lpsfr.serial);
      }
    },
    {
      oid: this.params.oid+".2",
      handler: (prq) => {
        var nodename = os.hostname();
        this.sendString(prq, this.params.lpsfr.internal);
      }
    },
    {
      oid: this.params.oid+".3",
      handler: (prq) => {
        this.getLatest()
        .then(item => {
          this.sendString(prq, item ? item.created_at.toString() : "");
        })
        .catch(err => {
          console.log(err);
          this.sendString(prq, err);
        })
      }
    },
    {
      oid: this.params.oid+".4",
      handler: (prq) => {
        this.getLatest()
        .then(item => {
          const behaviour = this.getConnectedStateString(item);
          this.sendString(prq, behaviour);
        })
        .catch(err => {
          console.log(err);
          this.sendString(prq, err);
        })
      }
    },
    {
      oid: this.params.oid+".5",
      handler: (prq) => {
        this.getLatest()
        .then(item => {
          const string = this.getImpactedString(item);
          this.sendString(prq, string);
        })
        .catch(err => {
          console.log(err);
          this.sendString(prq, err);
        })
      }
    },
    {
      oid: this.params.oid+".6",
      handler: (prq) => {
        this.getLatest()
        .then(item => {
          this.sendString(prq, item ? item.data : "");
        })
        .catch(err => {
          console.log(err);
          this.sendString(prq, err);
        })
      }
    }
  ];
}

util.inherits(AlertairDC, Abstract);

module.exports = AlertairDC
