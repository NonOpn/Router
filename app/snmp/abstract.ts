import { DataPointModel } from '../database/data_point';
import DataPoint from "../database/data_point";
import snmp from "snmpjs";

export interface Filter {
  key: string,
  value: string;
}

export interface CallbackOID {
  (prq: any): void; 
}

export interface OID {
  oid: string;
  handler: CallbackOID;
}

export default class AbstractDevice {
  agent: any|undefined;
  params: any|undefined;
  snmp: any|undefined;
  data_point_provider: DataPoint;

  constructor() {
    this.agent = undefined;
    this.params = undefined;
    this.data_point_provider = new DataPoint();
  }

  setParams(params: any) {
    this.params = params;
    if(!this.params.no_snmp) {
      this.agent = snmp.createAgent();
      this.agent.request(this.asMib());
    }
    this.snmp = snmp;
    //this.data_point_provider = new DataPoint();
  }

  getId(): number {
    const lpsfr = this.getLPSFR();
    if(lpsfr && lpsfr.id) return lpsfr.id;
    return 0;
  }

  getUUID(): string {
    var uuid = this.getId().toString(16);
    if(uuid.length) while(uuid.length < 4) uuid="0"+uuid;
    return uuid;
  }

  getSerial(): Promise<string> {
    return this._getPromiseCharacteristic("serial");
  }

  getInternalSerial(): Promise<string> {
    return this._getPromiseCharacteristic("internal");
  }

  getType(): Promise<number> {
    return this._getPromiseCharacteristic("type");
  }

  _getPromiseCharacteristic(name: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if(this.params && this.params.lpsfr) resolve(this.params.lpsfr[name]);
      else resolve("");
    })
  }

  getSyncInternalSerial(): string|undefined {
    return this.params && this.params.lpsfr ? this.params.lpsfr.internal : undefined;
  }

  getConnectedStateString(item: DataPointModel|undefined): string {
    return "not_implemented";
  }

  getImpactedString(item: DataPointModel|undefined): string {
    return "not_implemented";
  }

  getLPSFR(): any {
    return this.params.lpsfr;
  }

  getLatest(): Promise<DataPointModel|undefined> {
    const filter: Filter = this.getStandardFilter();
    return this.data_point_provider.findMatching(filter.key, filter.value);
  }

  getConnectedState(): Promise<string> {
    return this.getLatest()
    .then(item => this.getConnectedStateString(item));
  }

  getImpactedState(): Promise<string> {
    return this.getLatest()
    .then(item => this.getImpactedString(item));
  }

  getStandardFilter(): Filter { throw "must be defined"; }

  asMib(): any { throw "must be defined" }

  sendString(prq: any, string: string) {
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
