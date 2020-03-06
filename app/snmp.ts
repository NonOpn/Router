import { EventEmitter } from "events";

import config from "../config/snmp.json";
import snmp from 'snmpjs';
import DataPoint from "./database/data_point";
import Paratonair from "./snmp/paratonair";
import AlertairDC from "./snmp/alertairdc";
import Ellips from "./snmp/ellips";

const array = {
	paratonair: Paratonair,
	comptair: Paratonair,//same
	alertairdc: AlertairDC,
	ellips: Ellips
}
const VERSION = "0.1";

function instantiate(params: any) {
	if(params && params.lpsfr) {
		const klass = array[params.lpsfr.type];
		if(klass) {
			return new (klass)(params);
		}
	}
	return undefined;
}



export default class SNMP extends EventEmitter {
	agents: any[];
	agent: any;
	data_point_provider: DataPoint;

	constructor() {
		super();

		this.agents = [];
		this.data_point_provider = new DataPoint();
	}

	onFrame(data: any) {
		if(data && data.sender) {
			this.applyData(data);
		}
	}
	
	applyData(data: any) {
		const _data = data ? data : {};
		var rawdata = _data.rawByte || _data.rawFrameStr;

		if(!rawdata || (rawdata != 48 && rawdata != 60)) {
			return;
		}

		//for now, using only lpsfr devices
		if(rawdata.length === 60) { //30*2
			const internal = rawdata.substring(0, 6);
			const callback = () => { //manage contactair ready v2 if not ffffff
				this.agents.forEach(agent => {
					var lpsfr = agent != undefined ? agent.getLPSFR() : {};
					if(rawdata.length > 6 && (lpsfr.type === "paratonair" || lpsfr.type === "comptair")) {
						const config_internal = lpsfr.internal.substring(0, 6);

						if(internal === config_internal) {
							this.data_point_provider.savePoint(lpsfr.serial, config_internal, data.sender, rawdata);
						}
					}
				});
			}

			if(internal === "ffffff") {
				this.data_point_provider.latestForContactair(data.sender)
				.then(item => {
					if(item) {
						this.data_point_provider.savePoint(item.serial, item.internal, data.sender, rawdata);
					} else {
						callback();
					}
				}).catch(err => {
					console.log(err);
					callback();
				});
			} else {
				callback();
			}

		} else if(rawdata.length === 48) { //24*2
			this.agents.forEach(agent => {
				const lpsfr = agent.getLPSFR();
				if(lpsfr.internal === data.sender && lpsfr.type === "ellips") {
					this.data_point_provider.savePoint(lpsfr.serial, lpsfr.internal, data.sender, rawdata);
				}
			})
		}
	}
	
	connect() {
		this.agent = snmp.createAgent();
	
		var mib = [{
			oid: config.router_oid+".1",
			handler: (prq: any) => {
				var val = snmp.data.createData({
					type: "OctetString",
					value: "Rout@ir v"+VERSION
				});
	
				snmp.provider.readOnlyScalar(prq, val);
			}
		},
		{
			oid: config.router_oid+".2",
			handler: (prq: any) => {
				var val = snmp.data.createData({
					type: "OctetString",
					value: new Date().toString()
				});
	
				snmp.provider.readOnlyScalar(prq, val);
			}
		}];
	
		config.agents.forEach((conf: any) => {
			try{
				const instance = instantiate(conf);
				instance.asMib().forEach((sub_mib: any) => {
					mib.push(sub_mib)
				});
	
				this.agents.push(instance);
			}catch(e) {
				console.log(e);
			}
	
		});
		this.agent.request(mib);
		this.agent.bind({ family: 'udp4', port: 161 });
	}
}