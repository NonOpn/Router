import { Diskspace } from "../system";
import { Logger } from ".";
import NetworkInfo from "../network";
import FrameModel from "../push_web/frame_model";

export default class Reporter {
    public static instance: Reporter = new Reporter();

    private started: boolean = false;

    start() {
        if(this.started) return;

        this.started = true;
        this._report();
        setInterval(() => this._report(), 60 * 60 * 1000); //60min * 60s * 1000ms
    }

    private _report = async () => {
      var space: any = {};
      var count: number = 0;
      try {
        space = await Diskspace.instance.diskspace();
      } catch(ee) {

      }

      try {
        count = await FrameModel.instance.getCount();
      } catch(e) {

      }

      try {
        await Logger.data({ context: "space", space, database: { count } });
      } catch(eee) {

      }
    }
}