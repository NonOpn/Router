export default class EnoceanSend {
    buildTelegram(packetType: any, data: any, optionaldata: any): any[];
    arrayToHex(array: number[]): string;
    createOptionalData(destination: any): number[];
}
