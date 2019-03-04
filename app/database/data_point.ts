import mongoose from "mongoose";

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

export interface DataPointModel {
  serial: string;
  internal: string;
  contactair: string;
  data: string;
  created_at: Date;

  //TODO method signatures
}

export default class DataPoint {
  static instance: DataPoint = new DataPoint();
  
  constructor() {

  }

  savePoint(serial: string, internal: string, contactair: string, data: string): Promise<DataPointModel> {
    return new Promise((resolve, reject) => {
      console.log("save "+serial+" "+internal+" "+contactair);
      const object = new DataPointModel({
        serial: serial,
        internal: internal,
        contactair: contactair,
        data : data
      });

      object.save((err: Error) => {
        if(err) reject(err);
        else resolve(object);
      });
    });
  }

  latestForContactair(contactair: string): Promise<DataPointModel> {
    return this.findLatestWithParams({contactair: contactair});
  }

  latestForSerial(serial: string): Promise<DataPointModel> {
    return this.findLatestWithParams({serial: serial});
  }

  latestForInternal(internal: string): Promise<DataPointModel> {
    return this.findLatestWithParams({internal: internal});
  }

  findLatestWithParams(params: any): Promise<DataPointModel> {
    return new Promise((resolve, reject) => {
      this.queryWithParams(params)
      .findOne()
      .sort({"created_at": -1})
      .exec((err: Error, data: DataPointModel) => {
        if(err) reject(err);
        else resolve(data);
      })
    });
  }

  queryWithParams(params: any): any {
    return DataPointModel.find(params);
  }
}
