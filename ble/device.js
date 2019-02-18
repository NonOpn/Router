const EventEmitter = require("events").EventEmitter,
util = require("util"),
DataPoint = require("../database/data_point"),
model_devices = require("../push_web/device_model"),
Paratonair = require("../snmp/paratonair"),
AlertairDC = require("../snmp/alertairdc"),
Ellips = require("../snmp/ellips");

const TYPE_PARATONAIR = 0;

class DeviceManagement {

    constructor() {
	    this.data_point_provider = new DataPoint();
    }

    onFrame(data) {
    	if(data && data.sender) {
	    	this.applyData(data);
    	}
    }

    list() {
        return model_devices.list()
        .then(devices => devices ? devices : [])
        .then(devices => devices.map(device => this._databaseDeviceToRealDevice(device)))
        .then(devices => devices.filter(device => device));
    }

    _databaseDeviceToRealDevice(device) {
        if(device.type == TYPE_PARATONAIR) {
            return new Paratonair({
                no_snmp: true,
                lpsfr: {
                    type: "paratonair",
                    serial: device.serial,
                    internal: device.internal_serial,
                    id: device.id
                }
            });
        } else {
            console.log("unnown type !", device);
            return undefined;
        } 
    }

    getDevice(internal) {
        return model_devices.getDeviceForInternalSerial(internal)
        .then(device => {
            console.log("getDevice, first :=", device);
            if(device) return device;
            return model_devices.saveDevice({ serial: "", internal_serial: internal, type: TYPE_PARATONAIR });
        })
        .then(device => this._databaseDeviceToRealDevice(device));
    }

    applyData(data) {
        if(data && data.rawFrameStr) { //for now, using only lpsfr devices
            //rawFrameStr and rawDataStr are set
            if(data.rawFrameStr.length === 60) { //30*2
                const rawdata = data.rawDataStr;
                const internal = rawdata.substring(0, 6);

                const callback = () => {
                    this.getDevice(internal)
                    .then(device => {
                        console.log("having device := ", device);
                        const lpsfr = device.getLPSFR();
    
                        if(rawdata.length > 6 && (lpsfr.type === "paratonair" || lpsfr.type === "comptair")) {
                            const config_internal = lpsfr.internal.substring(0, 6);
    
                            if(internal === config_internal) {
                                console.log("having internal correct");
                                this.data_point_provider.savePoint(lpsfr.serial, config_internal, data.sender, data.rawDataStr);
                            }
                        }
                    })
                    .catch(err => {
                        console.log(err);
                    });
                };

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
}

module.exports = new DeviceManagement();