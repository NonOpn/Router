const EventEmitter = require("events").EventEmitter,
util = require("util"),
config = require("./config/config.js"),
push_web_config = require("./config/push_web"),
FrameModel = require("./push_web/frame_model"),
request = require('request'),
errors = require("./errors");

const VERSION = "0.0";

function createRequestRaw(raw) {
	return {
		host: config.identity,
		version: 2,
		data: raw
	};
}

function createRequest(data /*buffer hex */) {
	const base64 = data.toString("base64");
	return {
		host: config.identity,
		version: 2,
		data: base64
	};
}

var PushWEB = function() {
	this.is_activated = push_web_config.is_activated;
}

PushWEB.prototype.onFrame = function(data) {
	if(this.is_activated && data && data.sender) {
		this.applyData(data);
	}
}

PushWEB.prototype.applyData = function(data) {
	if(!this.is_activated) return;
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
	if(!this.is_activated) return;

	const hex = Buffer.from(rawFrameStr);
	return
}

PushWEB.prototype.compress30 = function(rawFrameStr) {
	if(!this.is_activated) return;

}

PushWEB.prototype.connect = function() {
	if(!this.is_activated) {
		console.log("PushWEB is disabled see .env.example");
	} else {
		console.log("PushWEB is now init");

		this.sendEcho();
		setInterval(() => {
			this.sendEcho();
		}, 30 * 60 * 1000);

		setTimeout(() => {
			this.trySend()
		}, 1 * 60 * 1000);//every 60s
	}
}

PushWEB.prototype.sendEcho = function() {
	if(!this.is_activated) {
		console.log("inactivated....");
		return;
	}

	console.log("posting");
	request.post({
		url: "https://contact-platform.com/api/echo",
		json: {
			host: config.identity,
			version: 1
		}
	}, (e, response, body) => {
		//nothing to do
		console.log(body);
	});
}

PushWEB.prototype.trySend = function() {
	if(!this.is_activated) return;

	FrameModel.getUnsent()
	.then((frames) => {
		const callback = (i) => {
			if(null == frames || i >= frames.length) {
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
						FrameModel.setSent(frame.id, true)
						.then(() => {
							console.log("set sent "+frame.id);
							callback(i+1);
						})
						.catch(err => {
							errors.postJsonError(err);
							callback(i+1);
						});
					} else {
						try {
							console.log("error with "+frame.id);
						} catch(err) {
								errors.postJsonError(err);
						}
						callback(i+1);
					}
				});
			}
		}

		callback(0);
	})
	.catch(err => {
		errors.postJsonError(err);
		this.postNextTrySend();
	});
}

PushWEB.prototype.postNextTrySend = function() {
	if(!this.is_activated) return;

	setTimeout(() => {
		this.trySend();
	}, 1 * 60 * 1000);
}

util.inherits(PushWEB, EventEmitter);

module.exports = PushWEB;
