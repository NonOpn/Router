import { EventEmitter } from "events";
import config from "./config/config.js";
import Errors from "./errors";
import request from "request";
import FrameModel from "./push_web/frame_model";
import push_web_config from "./config/push_web";
import FrameModelCompress from "./push_web/frame_model_compress.js";
import { Logger } from "./log/index.js";
import AbstractDevice from "./snmp/abstract.js";
import NetworkInfo from "./network/index.js";

const errors = Errors.instance;

const VERSION = 10;

function _post(json: any) {
	console.log("posting json");
	return new Promise((resolve, reject) => {
		const gprs = NetworkInfo.instance.isGPRS();
		console.log("gprs mode ?", gprs);
		var url = "https://contact-platform.com/api/ping";
		if(gprs) {
			url = "http://contact-platform.com/api/ping";
		}
		try {
			request.post({ url, json }, (e: any, response: any, body: any) => {
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

export default class PushWEB extends EventEmitter {
	is_activated: boolean = true;
	_posting: boolean;

	constructor() {
		super();
		//this.is_activated = push_web_config.is_activated;
		this._posting = false;
	}

	trySend() {
		try {
			if(this._posting || !this.is_activated) return;
			this._posting = true;
			console.log("try send to send frames");
	
			FrameModel.instance.getUnsent()
			.then((frames) => {
				console.log("frames ? " + frames);
				const callback = (i: number) => {
					console.log("callback called with " + i);
					if(null == frames || i >= frames.length) {
						console.log("finished");
						this._posting = false;
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
				//Logger.error(err, "in push_web");
				//errors.postJsonError(err);
				this._posting = false;
			});
		} catch(e) {
			this._posting = false;
		}
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

	onFrame(device: AbstractDevice|undefined, data: any) {
		this.applyData(device, data);
	}

	private _started: boolean = false;

	connect() {
		if(this._started) return;

		if(!this.is_activated) {
			this._started = true;
			console.log("PushWEB is disabled see .env.example");
			this.sendEcho();
			setInterval(() => {
				this.sendEcho();
			}, 15 * 60 * 1000); //set echo every 15minutes

		} else {
			this._started = true;
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

	applyData(device: AbstractDevice|undefined, data: any) {
		const _data = data ? data : {};
		var rawdata = _data.rawByte || _data.rawFrameStr;

		if(rawdata && rawdata.length != 48 && rawdata.length != 60) {
			return;
		}

		const to_save = FrameModel.instance.from(rawdata);
		to_save.product_id = device ? device.getId() : undefined;
		Promise.all([
			FrameModel.instance.save(to_save),
			FrameModelCompress.instance.save(to_save)
		])
		.then(saved => console.log(saved))
		.catch(err => {
			errors.postJsonError(err);
			console.log(err);
		});
	}
}
