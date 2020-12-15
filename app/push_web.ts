import { EventEmitter } from "events";
import config from "./config/config";
import Errors from "./errors";
import request from "request";
import FrameModel from "./push_web/frame_model";
import FrameModelCompress from "./push_web/frame_model_compress";
import AbstractDevice from "./snmp/abstract";
import NetworkInfo from "./network/index";
import { Logger } from "./log";

const errors = Errors.instance;

const VERSION = 12;

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
			request.post({ url, json, gzip: "true" }, (e: any, response: any, body: any) => {
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

interface RequestFrames {
	data: any,
	id?: number
}

export default class PushWEB extends EventEmitter {
	is_activated: boolean = true;
	_posting: boolean;
	_number_to_skip = 0;

	constructor() {
		super();
		//this.is_activated = push_web_config.is_activated;
		this._posting = false;
	}

	trySend() {
		if(NetworkInfo.instance.isGPRS() && this._number_to_skip > 0) {
			this._number_to_skip --;
			if(this._number_to_skip < 0) this._number_to_skip = 0;
			return;
		}

		this._number_to_skip = 4;
		this.trySendOk().then(() => {}).catch(err => {});
	}

	trySendOk = async () => {
		try {
			if(this._posting || !this.is_activated) {
				Logger.data({ context: "push_web", posting: this._posting, is_activated: this.is_activated });
				return;
			}

			console.log("try send to send frames");

			if(!NetworkInfo.instance.isGPRS()) Logger.data({ context: "push_web", infos: "entering" });
			//TODO for GPRS, when getting unsent, only get the last non alert + every alerts in the steps
			const frames = await FrameModel.instance.getUnsent()
			this._posting = true;
			console.log("frames ? " + frames);

			if(!NetworkInfo.instance.isGPRS()) Logger.data({ context: "push_web", infos: "obtained", size: frames.length });

			if(null == frames || frames.length == 0) {
				console.log("finished");
				this._posting = false;
			} else {
				var i = 0;

				while(i < frames.length) {
					const to_frames:RequestFrames[] = [];
					const json = createRequestRaw("");

					while(to_frames.length < 240 && i < frames.length) {
						to_frames.push({data: createRequestRaw(frames[i].frame).data, id: frames[i].id });
						i++;
					}

					if(frames.length > 0) {
						json.id = frames[frames.length - 1].id || -1;
					}

					json.data = to_frames.map(frame => frame.data).join(",");
					json.remaining = frames.length - i;
					json.gprs = !!NetworkInfo.instance.isGPRS();

					await _post(json)
					var j = 0;
					while(j < to_frames.length) {
						const frame = to_frames[j];
						await FrameModel.instance.setSent(frame.id || 0, true);
						j++;
					}
				}
			}
		} catch(e) {
			this._posting = false;
			errors.postJsonError(e);
			console.log("frames error... ");
			Logger.error(e, "in push_web");
			Logger.data({ context: "push_web", posting: this._posting, is_activated: this.is_activated, error: e });
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
