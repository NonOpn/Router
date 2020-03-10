"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = __importDefault(require("./errors"));
const errors = errors_1.default.instance;
const RESTART_DELAY = 180000; //restart the program after 180 000 ms
class MainEntryPoint {
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
        }
        else {
            const domain = require('domain');
            const created_domain = domain.create();
            process.on("uncaughtException", (err) => {
                console.log("oups", err);
            });
            created_domain.on('error', (err) => {
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
                        }
                        catch (er2) {
                        }
                    }, RESTART_DELAY);
                };
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
                    });
                }
                catch (e) {
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
exports.default = MainEntryPoint;
//# sourceMappingURL=index.js.map