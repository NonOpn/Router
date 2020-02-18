import { EventEmitter } from "events";
import config from "./config/config.js";
import Errors from "./errors";
import request from "request";
import FrameModel, { Transaction } from "./push_web/frame_model";
import push_web_config from "./config/push_web";
import FrameModelCompress from "./push_web/frame_model_compress.js";
import { Logger } from "./log/index.js";
import DeviceManagement from "./ble/device.js";

const errors = Errors.instance;

const VERSION = 8;

interface IdFrame {
	frame: string,
	id: number
}

interface MappingHolder {
	internal_serial: string,
	data: IdFrame[]
}

export default class FrameManagerAlert extends EventEmitter {
	static instance: FrameManagerAlert = new FrameManagerAlert();

	private _started: boolean = false;
	private _current_index = 0;

	constructor() {
		super();
	}

	public start() {
		if(this._started) return;

		this._started = true;

		setTimeout(() => this.checkNextTransactions(), 1);
	}

	private setDevicesForInvalidProductsOrAlerts(frames: Transaction[]): Promise<any> {
		const isProductButNeedAlertOrNot = (f: Transaction) => f && f.product_id && (undefined == f.is_alert || null == f.is_alert);
		const hasNotProduct = (f: Transaction) => f && !f.product_id;

		return new Promise((resolve, reject) => {
			const internal_serials = frames.filter(f => isProductButNeedAlertOrNot(f) || hasNotProduct(f)).map(f => ({
				internal_serial: FrameModel.instance.getInternalSerial(f.frame),
				frame: f.frame,
				id: f.id || 0
			}));

			if(internal_serials.length == 0) {
				console.log("this batch has no device to update", frames);
				resolve(true);
				return;
			}

			const serials: string[] = [];
			const mapping: MappingHolder[] = [];
			internal_serials.forEach(pre_holder => {
				const { id, internal_serial, frame } = pre_holder;
				if(!mapping[internal_serial]) {
					mapping[internal_serial] = { internal_serial, data: []};
					serials.push(internal_serial);
				}

				mapping[internal_serial].data.push({id, frame});
			});

			Promise.all( serials.map( serial => DeviceManagement.instance.getDevice(serial).then( device => ({device, serial}) ) ) )
			.then(devices => devices.filter(d => d.device))
			.then(devices => {
				console.log("having devices " + devices.filter(d => d.device).length);
				const promises: Promise<boolean>[] = [];
				devices.forEach(tuple => {
					const { device, serial } = tuple;
					const holder: MappingHolder = mapping[serial];

					device && holder.data.forEach((data, index) => {
						const { id, frame } = data;
						promises.push(device.getType().then(rawType => {
							const type = DeviceManagement.instance.stringToType(rawType);
							const is_alert = DeviceManagement.instance.isAlert(type, frame);
							return FrameModel.instance.setDevice(id, device.getId(), is_alert);
						}))
					});
				});
				return Promise.all(promises)
			})
			.then(() => {
				console.log("batch done to set device information");
				resolve(true);
			})
			.catch(err => reject(err));
		});
	}

	private checkNextTransactions() {
		FrameModel.instance.getFrame(this._current_index, 200)
		.then(frames => {
			frames = frames || [];

			if(frames.length == 0) {
				console.log("no frame to manage at all... we reset the loop...");
				this._current_index = -1;
				return Promise.resolve(true);
			}

			var next = frames.reduce((t1, t2) => {
				if(!t1.id) return t2;
				if(!t2.id) return t1;
				return t1.id > t2.id ? t1 : t2;
			}, frames[0]);

			return this.setDevicesForInvalidProductsOrAlerts(frames)
			.then(done => {
				this._current_index = next.id || -1;
				console.log("new_index is now _current_index:=" + this._current_index);
				return done;
			});
		})
		.then(done => {
			console.log("batch ?", done);
			setTimeout(() => this.checkNextTransactions(), 200);
		})
		.catch(err => {
			console.error("error", err);
			setTimeout(() => this.checkNextTransactions(), 5000);
		})
	}
}
