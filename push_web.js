const EventEmitter = require("events").EventEmitter,
util = require("util"),
config = require("./config/config.js"),
push_web_config = require("./config/push_web"),
FrameModel = require("./push_web/frame_model"),
request = require('request'),
errors = require("./errors");

const VERSION = "0.0";

function _post(json) {
	return new Promise((resolve, reject) => {
		try {
			request.post({
				url: "https://contact-platform.com/api/ping",
				json: json
			}, (e, response, body) => {
				if(response && response.statusCode) {
					resolve(body);
				} else {
					reject(e);
				}
			});
		} catch(err) {
			reject(err);
		}
	});
}

function createRequestRaw(raw) {
	return {
		host: config.identity,
		version: 3,
		data: raw
	};
}

function createRequest(data /*buffer hex */) {
	const base64 = data.toString("base64");
	return { host: config.identity, version: 3, data: base64 };
}

class PushWEB extends EventEmitter {
	constructor() {
		super();
		this.is_activated = push_web_config.is_activated;
		this._posting = false;
	}

	trySend() {
		if(this._posting || !this.is_activated) return;
		this._posting = true;

		FrameModel.getUnsent()
		.then((frames) => {
			const callback = (i) => {
				if(null == frames || i >= frames.length) {
					this._posting = false;
				} else {
					const frame = frames[i];
					//const hex = Buffer.from(frame.frame, "hex");
					const json = createRequestRaw(frame.frame); //createRequest(hex);
					_post(json)
					.then(body => {
						return FrameModel.setSent(frame.id, true);
					})
					.then(saved => {
						callback(i+1);
					})
					.catch(err => {
						console.log(err);
						errors.postJsonError(err);
						callback(i+1);
					});
				}
			}

			callback(0);
		})
		.catch(err => {
			errors.postJsonError(err);
			this._posting = false;
		});
	}

	sendEcho() {
		if(!this.is_activated) {
			console.log("inactivated....");
			return;
		}

		new Promise((resolve, reject) => {
			request.post({
				url: "https://contact-platform.com/api/echo",
				json: { host: config.identity, version: 3 }
			}, (e, response, body) => {
				//nothing to do
				console.log(body);
				resolve(true);
			});
		})
		.then(result => {
			console.log("echo posted");
		})
		.catch(err => {
			console.log("echo error", err);
			errors.postJsonError(err);
		})
	}

	onFrame(data) {
		if(this.is_activated && data && data.sender) {
			this.applyData(data);
		}
	}

	connect() {
		if(!this.is_activated) {
			console.log("PushWEB is disabled see .env.example");
		} else {
			console.log("PushWEB is now init");

			this.sendEcho();
			setInterval(() => {
				this.sendEcho();
			}, 15 * 60 * 1000); //set echo every 15minutes

			setInterval(() => {
				console.log("try send... " + this.is_activated);
				this.trySend()
			}, 1 * 60 * 1000);//every 60s
		}
	}

	applyData(data) {
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
			.then(saved => console.log(saved))
			.catch(err => {
				errors.postJsonError(err);
				console.log(err);
			})
		}
	}
}

module.exports = PushWEB;
