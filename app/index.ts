import Errors from "./errors";

const errors = Errors.instance;

interface Upgradable {
  upgradable: boolean,
  version: string
}

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
      });
  
      created_domain.on('error', (err: any) => {
  
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
        const App = require("./app");

        const app = new App();
        app.start();
      });
    }
  }
}