import config from "../config/config";
import request from "request";
import { Bash } from "../systemctl";
import { Logger } from "../log";

class Diagnostic {

  private _started = false;
  private diagnostics: any[] = [];

  private log(arg1: string, arg2?: any) {
    if(arguments.length == 1) console.warn("Diagnosstic :: " + arg1);
    else console.warn("Diagnosstic :: " + arg1, arg2);
  }

  start() {
    if(this._started) return;
    this._started = true;

    new Bash().exec("/usr/local/routair/scripts/configure_i2c.sh")
    .then(result => this.log("Bash", result)).catch(err => this.log("Bash, error", err));

    setInterval(() => this.onTick().catch(err => this.log("onTick", err)), 60 * 1000);
    setInterval(() => this.onManage().catch(err => this.log("onManage", err)), 60 * 60 * 1000);
  }

  private onTick = async () => {
    const diagnostic = await this.fetch();
    if(!!diagnostic) this.diagnostics.push(diagnostic);
    this.log("onTick", this.diagnostics);
  }

  private onManage = async () => {
    const diagnostics = [...this.diagnostics];
    this.diagnostics = [];
    await this.send(diagnostics);
  }

  send(diagnostics: any): Promise<void> {
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

  fetch(): Promise<any> {
    const url = "http://127.0.0.1:5000/report"
    //in gprs mode, simply sends the values
    return new Promise((resolve, reject) => {
      try {
        request.get({ url }, (e: any, response: any, body: any) => {
          if(e) {
            reject(e);
          } else {
            try {
              if(typeof body == "string") body = JSON.parse(body);
              resolve(body);
            } catch(e) {
              reject(e);
            }
          }
        });
      } catch(err) {
        reject(err);
      }
    });
  }
}

export default new Diagnostic();