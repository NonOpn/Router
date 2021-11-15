import config from "../config/config";
import request from "request";
import { Bash } from "../systemctl";
import { Logger } from "../log";

class Diagnostic {

  private _started = false;
  private diagnostics: any[] = [];

  private log(arg1: string, arg2?: any) {
    return;
    //if(arguments.length == 1) console.warn("Diagnosstic :: " + arg1);
    //else console.warn("Diagnostic :: " + arg1, arg2);
  }

  start() {
    if(this._started) return;
    this._started = true;

    new Bash().exec("/usr/local/routair/scripts/configure_i2c.sh")
    .then(result => this.log("Bash", result)).catch(err => this.log("Bash, error", err));

    setInterval(() => this.onManage().catch(err => this.log("onManage", err)), 60 * 60 * 1000);
  }

  private onManage = async () => {
    const diagnostics = [...this.diagnostics];
    this.diagnostics = [];
    await this.send(diagnostics);
  }

  private send = async (diagnostics: any) => {
    var i = 1;
    while(i < 6) {
      try {
        await this.sendRetry(diagnostics);
        return;
      } catch(e) { }

      await this.wait(i * 1000);
      i++;
    }
  }

  private wait = async (time: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), time);
    })
  }

  private sendRetry(diagnostics: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      Logger.data({diagnostics});
      request.post({
        url: "https://api.contact-platform.com/v3/routair/data",
        json: {
          routair: config.identity,
          diagnostics
        }
      }, (e: any, response: any, body: any) => {
        resolve();
      });
		});
  }

  public onConfiguration(diagnostic: any) {
    if(!this.diagnostics) this.diagnostics = [];
    this.diagnostics.push(diagnostic);
    console.log(`onConfiguration :: having ${this.diagnostics.length} diagnostic in queue`);
  }
}

export default new Diagnostic();