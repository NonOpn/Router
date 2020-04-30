import { Diskspace } from "../system";
import { Logger } from ".";
import NetworkInfo from "../network";

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
        if(space) {
          Logger.identity(space, ["space"]);
        }
      })
      .catch(err => console.log(err));
    }
}