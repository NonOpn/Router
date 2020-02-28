import { EventEmitter } from "events";
export default class FrameManagerAlert extends EventEmitter {
    static instance: FrameManagerAlert;
    private _started;
    private _current_index;
    constructor();
    start(): void;
    private deviceForContactair(devices, contactair);
    private deviceForInternal(devices, internal_serial);
    private isProductButNeedAlertOrNot;
    private hasNotProduct;
    private hasProduct;
    private tryUpdateDevicesForContactairs(devices, internal_serials);
    private setDevicesForInvalidProductsOrAlerts(devices, frames);
    private manageFrame(devices, from, until);
    private checkNextTransactions();
}
