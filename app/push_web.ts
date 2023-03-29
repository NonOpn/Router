import { EventEmitter } from "events";
import config from "./config/config";
import Errors from "./errors";
//@ts-ignore
import request from "request";
import FrameModel, { Transaction } from "./push_web/frame_model";
import FrameModelCompress from "./push_web/frame_model_compress";
import AbstractDevice from "./snmp/abstract";
import NetworkInfo from "./network/index";
import { Logger } from "./log";
import EnoceanLoader from "./enocean";

const errors = Errors.instance;

const VERSION = config.version;

function _post(json: any) {
	const gprs = NetworkInfo.instance.isGPRS();
	console.log("posting json");

	if(!gprs) {
		return Logger.post("contact-platform.com", 443, "/api/ping", {}, json);
	}

	//in gprs mode, simply sends the values
	return new Promise((resolve, reject) => {
		console.log("gprs mode ?", gprs);
		var url = "http://contact-platform.com/api/ping";

		try {
			request.post({ url, json, gzip: !!gprs }, (e: any, response: any, body: any) => {
				if(e) {
					reject(e);
				} else {
					resolve(body);
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
	private _posting: boolean;
	private _number_to_skip = 0;

	private _protection_network: number = 0;
	private memory_transactions: Transaction[] = [];

	constructor(private enocean: EnoceanLoader) {
		super();
		this._posting = false;
	}

	log(data: any) {
		if(NetworkInfo.instance.isGPRS()) return;
		Logger.data({context: "push", ...data});
	}
	  
	trySend = async () => {
		try {
			if(NetworkInfo.instance.isGPRS() && this._number_to_skip > 0) {
				this._number_to_skip --;
				if(this._number_to_skip < 0) this._number_to_skip = 0;
				return;
			}
	
			this._number_to_skip = 15; //4
	
			if(!!this._posting) {
				this._protection_network ++;
	
				//if we have a timeout of 30min which did not clear the network stack... reset !
				if(this._protection_network >= 3) {
					this._protection_network = 0;
					this._posting = false;
				}
	
				return;
			}
		} catch(e) {
			Logger.error(e, "in method trySend");
			return;
		}

		try {
			//send data over the network
			this._posting = true;
			await this.trySendOk();
		} catch(e) {
			Logger.error(e, "error in trySendOk");
		}

		this._protection_network = 0;
		this._posting = false;
	}

	trySendOk = async () => {
		try {
			//TODO for GPRS, when getting unsent, only get the last non alert + every alerts in the steps

			var crashed = false;
			var crashed_message = "";
			var frames: Transaction[] = [];
			// safely prevent crashes
			try {
				frames = await FrameModel.instance.getUnsent(120)
			} catch(e) {
				crashed = true;
				console.error("error while loading frames", e);
				crashed_message = `${e} but waiting is ${this.memory_transactions.length}`;
			}

			// this is a "last chance scenario", in this mode, we don't care about the frames before the last 120
			if(this.memory_transactions.length > 0) {
				var last120: Transaction[] = [];
				const length = this.memory_transactions.length;

				if(length <= 120) {
					last120 = this.memory_transactions;
				} else if(length > 120) {
					//add the last 120 items
					for(var i = 1; i <= 120; i++) {
						last120.push(this.memory_transactions[length - i]);
					}
					//reverse
					last120 = last120.reverse();
				}
				frames = [...frames, ...last120];
			}

			const json = createRequestRaw("");

			json.remaining = 0; //TODO get the info ?
			json.gprs = !!NetworkInfo.instance.isGPRS();
			json.crashed = crashed;
			json.crashed_message = crashed_message;

			if(null == frames || frames.length == 0) {
				this.log({ infos: "push", none: true });
				await _post(json);
			} else {
				const to_frames:RequestFrames[] = frames.map(f => ({data: createRequestRaw(f.frame).data, id: f.id }));
				json.data = to_frames.map(frame => frame.data).join(",");

				json.id = frames[frames.length - 1].id || -1;

				var first_id = frames.length > 0 ? frames[0].id : 0;
				const size = to_frames.length;
				const supportFallback = !!(config.identity || "").toLocaleLowerCase().startsWith("0xfaa4205");

				// we need support due to a device issue impacting the 0xfaa4205 rout@ir
				if(supportFallback) await this.setSent(to_frames);

				const result = await _post(json);
				this.log({ infos: "push", result, size, first_id });

				//even for the above mentionned device, not an issue : setSent changes a flag
				await this.setSent(to_frames);

				this.memory_transactions = [];
			}
		} catch(e) {
			this.log({ posting: this._posting, error: e });
			Logger.error(e, "in push_web");
			console.log("frames error... ");
		}
	}

	private async setSent(frames: RequestFrames[]) {
		var j = 0;
		while(j < frames.length) {
			const frame = frames[j];
			try {
				await FrameModel.instance.setSent(frame.id || 0, true);
			} catch(e) {

			}
			j++;
		}
	}

	private lastRequestGPRSCount = 0;

	private async sendEcho() {
		try {
			const devices = await this.enocean.systemDevices();
			const gprs = NetworkInfo.instance.isGPRS();
			const interfaces = NetworkInfo.instance.list()?.map(i => i?.name || "");
			const json = { host: config.identity, version: VERSION, devices, gprs, interfaces };
	
			if(!gprs) {
				await Logger.post("contact-platform.com", 443, "/api/echo", { }, json);
			} else {
				if (this.lastRequestGPRSCount <= 0) {
					this.lastRequestGPRSCount = 4;
					await new Promise((resolve, reject) => {
						request.post({
							url: "http://contact-platform.com/api/echo",
							json
						}, (e: any, response: any, body: any) => {
							//nothing to do
							console.log(body);
							resolve(true);
						});
					});
				} else {
					this.lastRequestGPRSCount -= 1;
				}
			}
	
			console.log("echo posted");
		} catch(err) {
			console.log("echo error", err);
			errors.postJsonError(err);
		}
	}

	onFrame(device: AbstractDevice|undefined, data: any) {
		this.applyData(device, data).then(() => {}).catch(e => {});
	}

	connect() {
		console.log("PushWEB is now init");

		this.sendEcho();
		setInterval(() => {
			this.sendEcho();
		}, 15 * 60 * 1000); //set echo every 15minutes

		this.trySend();

		setInterval(() => {
			console.log("try send... " + this._posting);
			this.trySend();
		}, 1 * 60 * 1000);//every 60s
	}

	private applyData = async (device: AbstractDevice|undefined, data: any) => {
		const _data = data ? data : {};
		var rawdata = _data.rawByte || _data.rawFrameStr;

		if(rawdata && rawdata.length != 48 && rawdata.length != 60) {
			return;
		}

		const to_save = FrameModel.instance.from(rawdata);
		to_save.product_id = device ? device.getId() : undefined;
		try {
			await FrameModel.instance.save(to_save);
			await FrameModelCompress.instance.save(to_save);
		} catch(err) {
			errors.postJsonError(err);
			console.log(err);
			this.memory_transactions.push(to_save);
		}
	}
}
