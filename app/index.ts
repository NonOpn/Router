import { Touch } from './system/Touch';
import Errors from "./errors";
import { Logger } from './log';
import NetworkInfo from './network';

const errors = Errors.instance;

const RESTART_DELAY: number = 180000; //restart the program after 180 000 ms

export default class MainEntryPoint {
  constructor() {

  }

  start() {
    console.log("starting routair main program...");

    const cluster = require('cluster');
  
    if (cluster.isMaster) {
      console.log("MASTER STARTED");
      cluster.fork();
  
      cluster.on('disconnect', () => {
        console.error('disconnect!');
        cluster.fork();
      });
  
    } else {
  
      const domain = require('domain');
      const created_domain = domain.create();
  
      process.on("uncaughtException", (err: any) => {
        console.log("oups", err);
        const gprs = NetworkInfo.instance.isGPRS();
        if(!gprs) Logger.error(err, "uncaughtException");
      });
  
      created_domain.on('error', (err: Error) => {
  
        const qSilent = () => {
          setTimeout(() => {
            try {
              // make sure we close down within RESTART_DELAY milliseconds
              const killtimer = setTimeout(() => {
                process.exit(1);
              }, RESTART_DELAY);
              // But don't keep the process open just for that!
              killtimer.unref();
              cluster.worker.disconnect();
            } catch (er2) {

            }
          }, RESTART_DELAY);
        }
  
        try {
          console.log("error :: " + err.message);

          if((err.message||"").indexOf("Cannot find module") >= 0) {
            console.log("module not found, trying to rebuild next time...");
            const touch = new Touch();
            touch.exec("/home/nonopn/rebuild")
            .then((result) => console.log("touch :: " + result))
            .catch((err: Error) => console.log(err));
          }

          console.log(err);
          errors.postJsonErrorPromise(err, "main crash")
          .then(val => {
            console.log("post done, quit");
            qSilent();
          })
          .catch(err => {
            console.log("post error, quit");
            qSilent();
          })
        } catch(e) {
          console.log("error error, quit", e);
          qSilent();
        }
      });
  
      created_domain.run(() => {
        const App = require("./app").App;

        const app = new App();
        app.start();
      });
    }
  }
}