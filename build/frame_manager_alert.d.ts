/// <reference types="node" />
import { EventEmitter } from "events";
export default class FrameManagerAlert extends EventEmitter {
    static instance: FrameManagerAlert;
    private _started;
    private _current_index;
    constructor();
    start(): void;
    private deviceForContactair;
    private deviceForInternal;
    private isProductButNeedAlertOrNot;
    private hasNotProduct;
    private hasProduct;
    private tryUpdateDevicesForContactairs;
    private setDevicesForInvalidProductsOrAlerts;
    private manageFrame;
    private checkNextTransactions;
}
