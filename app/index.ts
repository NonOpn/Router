import EnoceanLoader from "./enocean.js";
import Server from "./server.js";
import BLE from "./ble";
import SNMP from "./snmp.js";
import PushWEB from "./push_web.js";
import DiscoveryService from "./discovery";
import Wifi from "./wifi/wifi.js";
import Errors from "./errors";
import SSH from "./ssh.js";

const wifi = Wifi.instance;
const errors = Errors.instance;

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
              // make sure we close down within 30 seconds
              const killtimer = setTimeout(() => {
                process.exit(1);
              }, 30000);
              // But don't keep the process open just for that!
              killtimer.unref();
              cluster.worker.disconnect();
            } catch (er2) {
            }
          }, 30000);
        }
  
        try {
          console.log(err);
          errors.postJsonErrorPromise(err)
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
        var enocean = new EnoceanLoader();
        var server = new Server(enocean);
        var snmp = new SNMP();
        var push_web = new PushWEB();
        var discovery_service = new DiscoveryService();
        var ble = new BLE();
        var ssh = new SSH();
        
        //test successfull, since working, will reintroduce it in the future
        //expect around october
        /*
        ssh.stop()
        .then(() => {
          console.log("ssh stopped normally...");
          return ssh.disable();
        })
        .then(() => {
          console.log("ssh disabled normally");
        })
        .catch(err => {
          console.log("error on ssh", err);
        });
        */

        ssh.enable()
        .then(() => {
          console.log("ssh enabled normally...");
          return ssh.start();
        })
        .then(() => {
          console.log("ssh started normally");
        })
        .catch(err => {
          console.log("error on ssh", err);
        });


        wifi.start();
        server.start();
        snmp.connect();
        push_web.connect();
        enocean.register(server);
        discovery_service.bind();
        ble.start();
  
        enocean.on("usb-open", (port: any) => {
          console.log("device opened and ready");
          server.emit("usb-open");
        });
  
        enocean.on("usb-closed", (port_instantiated: any) => {
          console.log("device removed");
          server.emit("usb-closed");
        });
  
        enocean.on("managed_frame", (frame: any) => {
          ble.onFrame(frame);
          server.onFrame(frame);
          snmp.onFrame(frame);
          push_web.onFrame(frame);
        });
  
        enocean.on("frame", (frame: any) => {
        });
  
        snmp.on("log", (log: any) => {
          server.emit("log", log);
        });
      });
    }
  }
}