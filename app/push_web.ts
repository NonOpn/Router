import { EventEmitter } from "events";
import config from "./config/config.js";
import Errors from "./errors";
import request from "request";
import FrameModel from "./push_web/frame_model";
import push_web_config from "./config/push_web";
import FrameModelCompress from "./push_web/frame_model_compress.js";
import { Logger } from "./log/index.js";

const errors = Errors.instance;

const VERSION = 8;

function _post(json: any) {
	console.log("posting json");
	return new Promise((resolve, reject) => {
		try {
			request.post({
				url: "https://contact-platform.com/api/ping",
				json: json
			}, (e: any, response: any, body: any) => {
				console.log("answer obtained ", e);
				if(e) {
					reject(e);
				}else if(response && response.statusCode) {
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

function createRequestRaw(raw: any): any {
	return {
		host: config.identity,
		version: VERSION,
		data: raw
	};
}

function createRequest(data: Buffer /*buffer hex */) {
	const base64 = data.toString("base64");
	return { host: config.identity, version: VERSION, data: base64 };
}

export default class PushWEB extends EventEmitter {
	is_activated: boolean;
	_posting: boolean;

	constructor() {
		super();
		this.is_activated = push_web_config.is_activated;
		this._posting = false;
	}

	trySend() {
		if(this._posting || !this.is_activated) return;
		this._posting = true;
		console.log("try send to send frames");

		FrameModel.instance.getUnsent()
		.then((frames) => {
			console.log("frames ? " + frames);
			const callback = (i: number) => {
				console.log("callback called with " + i);
				if(null == frames || i >= frames.length) {
					_post({
						host: config.identity,
						version: VERSION,
						fnished: true
					})
					.then(body => {
						console.log("finished");
						this._posting = false;
					})
					.catch(err => {
						console.log("finished with network err");
						this._posting = false;
						errors.postJsonError(err);
					});
				} else {
					const frame = frames[i];
					//const hex = Buffer.from(frame.frame, "hex");
					const json = createRequestRaw(frame.frame); //createRequest(hex);
					json.remaining = frames.length - i;
					json.id = frame.id;

					_post(json)
					.then(body => {
						return FrameModel.instance.setSent(frame.id || 0, true);
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
			console.log("frames error... ");
			Logger.error(err, "in push_web");
			errors.postJsonError(err);
			this._posting = false;
		});
	}

	sendEcho() {
		new Promise((resolve, reject) => {
			request.post({
				url: "https://contact-platform.com/api/echo",
				json: { host: config.identity, version: VERSION }
			}, (e: any, response: any, body: any) => {
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

	onFrame(data: any) {
		if(/*this.is_activated && */data && data.sender) {
			this.applyData(data);
		}
	}

	connect() {
		if(!this.is_activated) {
			console.log("PushWEB is disabled see .env.example");
			this.sendEcho();
			setInterval(() => {
				this.sendEcho();
			}, 15 * 60 * 1000); //set echo every 15minutes

		} else {
			console.log("PushWEB is now init");

			this.sendEcho();
			setInterval(() => {
				this.sendEcho();
			}, 15 * 60 * 1000); //set echo every 15minutes

			this.trySend();

			setInterval(() => {
				console.log("try send... " + this.is_activated+" "+this._posting);
				this.trySend();
			}, 1 * 60 * 1000);//every 60s
		}
	}

	applyData(data: any) {
		//if(!this.is_activated) return;
		var rawData = undefined;

		if(data && data.rawFrameStr) {
			if(data.rawFrameStr.length === 60) { //30*2
				rawData = data.rawFrameStr; //compress30(data.rawFrameStr);
			} else if(data.rawFrameStr.length === 48) { //24*2
				rawData = data.rawFrameStr; //compress24(data.rawFrameStr);
			}
		}

		if(rawData) {
			const to_save = FrameModel.instance.from(rawData);
			Promise.all([
				FrameModel.instance.save(to_save),
				FrameModelCompress.instance.save(to_save)
			])
			.then(saved => console.log(saved))
			.catch(err => {
				errors.postJsonError(err);
				console.log(err);
			})
		}
	}
}
