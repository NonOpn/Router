import fd from "fd-diskspace";
import { DU } from "../systemctl";

export interface Space {
    free: number;
    size: number;
    used: number;
    percent: number;
}

export default class Diskspace {

    private du: DU;
    public static instance = new Diskspace();

    constructor() {
        this.du = new DU();
    }

    public diskspace(): Promise<Space> {
        return new Promise<Space>((resolve, reject) => {
            fd.diskSpace((err: Error, result: any) => {
                if(err) {
                    reject(err);
                } else {
                    var res: Space = { free: 0, size: 0, used: 0, percent: 0 };
                    if(result && result.total) {
                        res.free = result.total.free || 0;
                        res.size = result.total.size || 0;
                        res.used = result.total.used || 0;
                        res.percent = result.total.percent || 0;
                    }
                    resolve(res);
                }
            });
        });
    }

    public usage(): Promise<string> {
        return this.du.exec("/", 1);
    }
}