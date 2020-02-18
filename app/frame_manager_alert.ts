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
	contactair: string,
	internal_serial: string,
	data: IdFrame[]
}

interface SerialContactair {
	internal_serial: string,
	contactair: string
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

	private getDeviceForInternalOrContactair(internal_serial: string, contactair: string): Promise<Device|undefined> {

	}

	private setDevicesForInvalidProductsOrAlerts(frames: Transaction[]): Promise<any> {
		const isProductButNeedAlertOrNot = (f: Transaction) => f && f.product_id && (undefined == f.is_alert || null == f.is_alert);
		const hasNotProduct = (f: Transaction) => f && !f.product_id;

		return new Promise((resolve, reject) => {
			const internal_serials = frames.filter(f => isProductButNeedAlertOrNot(f) || hasNotProduct(f)).map(f => ({
				internal_serial: FrameModel.instance.getInternalSerial(f.frame),
				contactair: FrameModel.instance.getContactair(f.frame),
				frame: f.frame,
				id: f.id || 0
			}));

			console.log("managing for frames ", internal_serials.filter(i => i.internal_serial != "ffffff").map(i => i.internal_serial+" / " + i.contactair));

			if(internal_serials.length == 0) {
				resolve(true);
				return;
			}

			const serials: string[] = [];
			const contactairs: string[] = [];

			const serial_to_contactair: string[] = [];
			
			const mapping_internal_serials: MappingHolder[] = [];
			const mapping_contactairs: MappingHolder[] = [];
			internal_serials.forEach(pre_holder => {
				const { id, internal_serial, frame, contactair } = pre_holder;

				if(internal_serial != "ffffff") {
					if(!mapping_internal_serials[internal_serial]) {
						mapping_internal_serials[internal_serial] = { contactair, internal_serial, data: []};
						serials.push(internal_serial);
					}
					mapping_internal_serials[internal_serial].data.push({id, frame});

					//TODO when being in the past, don't check for modification from earlier... add this into the first loop? the one using latest elements
					//or store into the device update ?

					//updating the mapping internal_serial -> contactair to check for modification
					if(!serial_to_contactair[internal_serial]) serial_to_contactair[internal_serial] = contactair;
				} else {
					if(!mapping_contactairs[contactair]) {
						mapping_contactairs[contactair] = { contactair, internal_serial: "", data: []};
						contactairs.push(contactair);
					}
					mapping_contactairs[contactair].data.push({id, frame});
				}
			});

			Promise.all(contactairs.map(contactair => {
				return DeviceManagement.instance.getDeviceForContactair(contactair)
				.then(device => {
					console.log(`found device for ${contactair} ?`, !!device);
					if(!device) return Promise.resolve(false);
					
					return device.getInternalSerial()
					.then(internal_serial => {
						if(internal_serial == "ffffff") { console.log("invalid serial found"); return false };

						const mapping_contactair: MappingHolder = mapping_contactairs[contactair];
						if(mapping_contactair) {
							const id_frames: IdFrame[] = mapping_contactair.data;
							if(!mapping_internal_serials[internal_serial]) {
								mapping_internal_serials[internal_serial] = { contactair, internal_serial, data: []};
								serials.push(internal_serial);
								console.log(`UPDATE_ALERTS contactair ${contactair} to internal_serial ${internal_serial} found`);

								//updating the mapping internal_serial -> contactair to check for modification
								if(!serial_to_contactair[internal_serial]) serial_to_contactair[internal_serial] = contactair;
							}
							id_frames.forEach(id_frame => mapping_internal_serials[internal_serial].data.push(id_frame));
						}
						return true;
					})
					.then(() => true);
				});
			}))
			.then(() => Promise.all( serials.map( (serial) => DeviceManagement.instance.getDevice(serial, serial_to_contactair[serial])
				.then( device => ({device, serial}) )
			)))
			.then(devices => devices.filter(d => d.device))
			.then(devices => {
				const promises: Promise<boolean>[] = [];
				devices.forEach(tuple => {
					const { device, serial } = tuple;
					const holder: MappingHolder = mapping_internal_serials[serial];

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
			.then(() => resolve(true))
			.catch(err => reject(err));
		});
	}

	private manageFrame(from: number, until: number): Promise<number> {
		return FrameModel.instance.getFrame(from, until)
		.then(frames => {
			frames = frames || [];
			console.log("frame found ? " + from + " " + until, frames.length);

			if(frames.length == 0) return Promise.resolve(-1);

			var next = frames.reduce((t1, t2) => {
				if(!t1.id) return t2;
				if(!t2.id) return t1;
				return t1.id > t2.id ? t1 : t2;
			}, frames[0]);

			return this.setDevicesForInvalidProductsOrAlerts(frames)
			.then(() => (next.id || -1) + 1);
		});
	}

	private checkNextTransactions() {
		FrameModel.instance.getMaxFrame()
		.then(maximum => {
			if(maximum > 0) return this.manageFrame(Math.max(1, maximum - 50), 50).then(() => true).catch(() => true);
			return Promise.resolve(true);
		})
		.then(() => this.manageFrame(this._current_index, 200))
		.then(new_index => {
			if(new_index == -1) {
				console.log("no frame to manage at all... we reset the loop...");
				this._current_index = -1;
				return new Promise(resolve => setTimeout(() => resolve(true), 50000));
			}

			this._current_index = new_index;
			return true;
		})
		.then(() => setTimeout(() => this.checkNextTransactions(), 500))
		.catch(err => {
			console.error("error", err);
			setTimeout(() => this.checkNextTransactions(), 5000);
		})
	}
}
