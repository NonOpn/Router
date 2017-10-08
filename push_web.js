const EventEmitter = require("events").EventEmitter,
util = require("util"),
config = require("./config/snmp.json"),
FrameModel = require("./push_web/frame_model");

const VERSION = "0.0";

var PushWEB = function() {
}

PushWEB.prototype.onFrame = function(data) {
	if(data && data.sender) {
		this.applyData(data);
	}
}

PushWEB.prototype.applyData = function(data) {
	var rawData = undefined;

	if(data && data.rawFrameStr) {
		if(data.rawFrameStr.length === 60) { //30*2
			rawData = data.rawDataStr;
		} else if(data.rawFrameStr.length === 48) { //24*2
			rawData = data.rawDataStr;
		}
		console.log(data.rawFrameStr.length, rawData);
	}

	if(rawData) {
		const to_save = FrameModel.from(rawData);
		FrameModel.save(to_save)
		.then(saved => {
			console.log(saved);
		})
		.catch(err => {
			console.log(err);
		})
	}
}

PushWEB.prototype.connect = function() {
	console.log("PushWEB is now init");

	setTimeout(() => {
		this.trySend()
	}, 1 * 10 * 1000);//every 60s
}

PushWEB.prototype.trySend = function() {
	FrameModel.getUnsent()
	.then((frames) => {
		frames.forEach((frame) => {
			console.log("having := ", frame.frame+" "+Buffer.from(frame.frame).toString('base64'));
		});

		this.postNextTrySend();
	})
	.catch(err => {
		console.log(err);
		this.postNextTrySend();
	});
}

PushWEB.prototype.postNextTrySend = function() {
	setTimeout(() => {
		this.trySend();
	}, 1 * 60 * 1000);
}

util.inherits(PushWEB, EventEmitter);

module.exports = PushWEB;
