import { DataPointModel } from './../database/data_point';
import AbstractDevice, { Filter, OID } from "./abstract";
export declare enum Detection {
    NORMAL = 0,
    CALIBRATION_OK = 1,
    DISTURBING = 2,
    NOISE = 3,
    FAR = 4,
    APPROACHING = 5,
    CLOSE_STRIKE = 6,
    STABLE_STORM = 7,
    DEPARTING = 8,
    ARRIVAL = 9
}
export default class AlertairTS extends AbstractDevice {
    constructor(params: any);
    getStandardFilter(): Filter;
    getConnectedStateString(item: DataPointModel | undefined): string;
    getImpactedString(item: DataPointModel | undefined): string;
    getAdditionnalInfo1String(item: DataPointModel | undefined): string;
    getAdditionnalInfo2String(item: DataPointModel | undefined): string;
    getDistance(item: DataPointModel | undefined): string;
    getDetectionType(item: DataPointModel | undefined): string;
    detectionStr(detection: Detection): "close" | "normal" | "arrival" | "departing" | "stable" | "approaching" | "far" | "noise" | "disturbing" | "cal_ok";
    asMib(): OID[];
}
