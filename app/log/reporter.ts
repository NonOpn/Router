import { MySQL } from "../systemctl";
import Diskspace from "../system";
import { Logger } from ".";

export default class Reporter {
    public static instance: Reporter = new Reporter();

    private started: boolean = false;
    private mysql: MySQL = new MySQL();

    start() {
        if(this.started) return;

        this.started = true;
        this._report();
        setInterval(() => this._report(), 15 * 60 * 1000);
    }

    private _report() {
        Diskspace.instance.diskspace()
        .then(space => {
          if(space) {
            Logger.identity(space, ["space"]);
          }
        })
        .catch(err => console.log(err));

        this.mysql.status()
        .then(status => {
          Logger.identity({mysql: status}, ["mysql", "service"]);
        })
        .catch(err => {
          console.error(err);
        });
    }
}