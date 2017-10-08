const EventEmitter = require("events").EventEmitter,
util = require("util"),
config = require("./config/snmp.json"),
snmp = require('snmpjs'),
DataPoint = require("./database/data_point"),
Paratonair = require("./snmp/paratonair"),
Ellips = require("./snmp/ellips");

const array = {
	paratonair: Paratonair,
	ellips: Ellips
}
const VERSION = "0.0";

function instantiate(params) {
	if(params && params.lpsfr) {
		const klass = array[params.lpsfr.type];
		if(klass) {
			return new (klass)(params);
		}
	}
	return undefined;
}




var SNMP = function() {
	this.agents = [];
	this.data_point_provider = new DataPoint();
}

SNMP.prototype.onFrame = function(data) {
	if(data && data.sender) {
		this.applyData(data);
	}
}

SNMP.prototype.applyData = function(data) {
	if(data) {
		if(data.rawFrameStr.length === 60) { //30*2
			const rawdata = data.rawDataStr;
			const internal = rawdata.substring(0, 6);
			const callback = () => {
				this.agents.forEach(agent => {
					const lpsfr = agent.getLPSFR();
					if(rawdata.length > 6 && lpsfr.type === "paratonair") {
						const config_internal = lpsfr.internal.substring(0, 6);

						if(internal === config_internal) {
							console.log("having internal correct");
							this.data_point_provider.savePoint(lpsfr.serial, config_internal, data.sender, data.rawDataStr);
						}
					}
				});
			}

			if(internal === "ffffff") {
				console.log("having a ffffff serial, disconnected or impacted", data.sender);
				this.data_point_provider.latestForContactair(data.sender)
				.then(item => {
					if(item) {
						this.data_point_provider.savePoint(item.serial, item.internal, data.sender, data.rawDataStr);
						console.log("saving to "+item.serial+" "+item.internal+" "+data.sender+" "+data.rawDataStr);
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

		} else if(data.rawFrameStr.length === 48) { //24*2
			this.agents.forEach(agent => {
				const lpsfr = agent.getLPSFR();
				if(lpsfr.internal === data.sender && lpsfr.type === "ellips") {
					this.data_point_provider.savePoint(lpsfr.serial, lpsfr.internal, data.sender, data.rawDataStr);
				}
			})
		}
	}
}

SNMP.prototype.connect = function() {

	this.agent = snmp.createAgent();

	var mib = [{
		oid: config.router_oid+".1",
		handler: (prq) => {
			var val = snmp.data.createData({
				type: "OctetString",
				value: "Rout@ir v"+VERSION
			});

			snmp.provider.readOnlyScalar(prq, val);
		}
	},
	{
		oid: config.router_oid+".2",
		handler: (prq) => {
			var val = snmp.data.createData({
				type: "OctetString",
				value: new Date().toString()
			});

			snmp.provider.readOnlyScalar(prq, val);
		}
	}];

	config.agents.forEach(conf => {
		try{
			const instance = instantiate(conf);
			instance.asMib().forEach(sub_mib => {
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

util.inherits(SNMP, EventEmitter);

module.exports = SNMP;
