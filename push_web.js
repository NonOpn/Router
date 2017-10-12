const EventEmitter = require("events").EventEmitter,
util = require("util"),
config = require("./config/config.js"),
FrameModel = require("./push_web/frame_model"),
request = require('request');

const VERSION = "0.0";


function createRequestRaw(raw) {
	return {
		host: config.identity,
		version: 1,
		data: raw
	};
}

function createRequest(data /*buffer hex */) {
	const base64 = data.toString("base64");
	return {
		host: config.identity,
		version: 1,
		data: base64
	};
}

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
			rawData = data.rawFrameStr; //compress30(data.rawFrameStr);
		} else if(data.rawFrameStr.length === 48) { //24*2
			rawData = data.rawFrameStr; //compress24(data.rawFrameStr);
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

PushWEB.prototype.compress24 = function(rawFrameStr) {
	const hex = Buffer.from(rawFrameStr);
	return
}

PushWEB.prototype.compress30 = function(rawFrameStr) {

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
		const callback = (i) => {
			if(i >= frames.length) {
				this.postNextTrySend();
			} else {
				const frame = frames[i];
				//const hex = Buffer.from(frame.frame, "hex");
				const json = createRequestRaw(frame.frame); //createRequest(hex);
				request.post({
					url: "https://contact-platform.com/api/ping",
					json: json
				}, (e, response, body) => {
					console.log("having := ", frame.frame, json);
					console.log(e);
					if(response && response.statusCode) {
						console.log(response.statusCode);
						FrameModel.setSent(frame.id, true)
						.then(() => {
							console.log("set sent "+frame.id);
							callback(i+1);
						});
					} else {
						//FrameModel.setSent(frame.id, true)
						//.then(() => {
						//	console.log("set sent "+frame.id);
						//	callback(i+1);
						//});
						console.log("error with "+frame.id);
						callback(i+1);
					}
				});
			}
		}

		callback(0);
	})
	.catch(err => {
		console.log(err);
		this.postNextTrySend();
	});
}

PushWEB.prototype.postNextTrySend = function() {
	setTimeout(() => {
		this.trySend();
	}, 1 * 10 * 1000);
}

util.inherits(PushWEB, EventEmitter);

module.exports = PushWEB;
