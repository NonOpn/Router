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

    private _report() {
      Diskspace.instance.diskspace()
      .then(space => {
        return FrameModel.instance.getCount()
        .then(count => {
          Logger.identity({ space, database: { count }}, ["space"]);
        });
      })
      .catch(err => console.log(err));
    }
}