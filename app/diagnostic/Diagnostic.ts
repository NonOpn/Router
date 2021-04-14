import config from "../config/config";
import request from "request";

class Diagnostic {

  private _started = false;
  start() {
    if(this._started) return;
    this._started = true;

    setInterval(() => this.onManage().catch(err => console.warn(err)), 60 * 60 * 1000);
  }

  private onManage = async () => {
    const diagnostic = await this.fetch();
    await this.send(diagnostic);
  }

  send(diagnostic: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      request.post({
        url: "https://api.contact-platform.com/v3/routair/data",
        json: {
          routair: config.identity,
          diagnostic
        }
      }, (e: any, response: any, body: any) => {
        resolve();
      });
		})

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
              resolve(body);
            }
          });
        } catch(err) {
          reject(err);
        }
      });
    }
  }
}

export default new Diagnostic();