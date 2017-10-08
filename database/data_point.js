const mongoose = require("mongoose");

const MONGO_SNMP = "mongodb://localhost/blog"

var DATA_POINT = new mongoose.Schema({
  serial : { type : String, default: "" },
  internal : { type : String, default: "" },
  contactair : { type : String, default: "" },
  enocean_relay : { type : String, default: "" },
  data : { type : String, default: "" },
  created_at : { type : Date, default : Date.now }
});


var options = { promiseLibrary: global.Promise };
var db = mongoose.createConnection(MONGO_SNMP, options);

var DataPointModel = db.model("DataPointModel", DATA_POINT);

function DataPoint() {

}

DataPoint.prototype.savePoint = function(serial, internal, contactair, data) {
  return new Promise((resolve, reject) => {
    console.log("save "+serial+" "+internal+" "+contactair);
    const object = new DataPointModel({
      serial: serial,
      internal: internal,
      contactair: contactair,
      data : data
    });

    object.save((err) => {
      if(err) reject(err);
      else resolve(object);
    });
  });
}

DataPoint.prototype.latestForContactair = function(contactair) {
  return this.findLatestWithParams({contactair: contactair});
}

DataPoint.prototype.latestForSerial = function(serial) {
  return this.findLatestWithParams({serial: serial});
}

DataPoint.prototype.latestForInternal = function(internal) {
  return this.findLatestWithParams({internal: internal});
}

DataPoint.prototype.findLatestWithParams = function(params) {
  return new Promise((resolve, reject) => {
    this.queryWithParams(params)
    .findOne()
    .sort({"created_at": -1})
    .exec((err, data) => {
      if(err) reject(err);
      else resolve(data);
    })
  });
}

DataPoint.prototype.queryWithParams = function(params) {
  return DataPointModel.find(params);
}

module.exports = DataPoint;
