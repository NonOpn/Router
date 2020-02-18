import { EventEmitter } from "events";
export default class FrameManagerAlert extends EventEmitter {
    static instance: FrameManagerAlert;
    private _started;
    private _current_index;
    constructor();
    start(): void;
    private getDeviceForInternalOrContactair(internal_serial, contactair);
    private setDevicesForInvalidProductsOrAlerts(frames);
    private manageFrame(from, until);
    private checkNextTransactions();
}
