const Abstract = require("./abstract"),
util = require("util"),
os = require('os');

function Ellips(params) {
  this.setParams(params);
}

Ellips.prototype.getStandardFilter = function() {
  return {
    serial: this.params.lpsfr.serial
  };
}

Ellips.prototype.getConnectedStateString = function(item) {
  if(!item || !item.data) return " ";
  const buffer = new Buffer(item.data, "hex");
  if(buffer.length >= 4) {
    const disconnect = (buffer[3] & 2) === 2;
    if(disconnect) return "disconnect";
  }
  return "connected";
}

Ellips.prototype.getImpactedString = function(item) {
  if(!item || !item.data) return " ";
  const buffer = new Buffer(item.data, "hex");
  if(buffer.length >= 4) {
    const disconnect = (buffer[3] & 1) === 0;
    if(disconnect) return "striken";
  }
  return "normal";
}

Ellips.prototype.asMib = function(parent) {
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
    }
  ];
}

util.inherits(Ellips, Abstract);


module.exports = Ellips
