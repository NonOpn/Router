import { Rebuild, Cat, npm, Bluetooth, Apt, Which, exists, AptCache } from './systemctl/index';
import EnoceanLoader from "./enocean.js";
import Server from "./server.js";
import BLE from "./ble";
import SNMP from "./snmp.js";
import PushWEB from "./push_web.js";
import DiscoveryService from "./discovery";
import Wifi from "./wifi/wifi.js";
import Errors from "./errors";
import { SSH } from "./systemctl";
import { Logger } from "./log/index.js";
import Diskspace from "./system/index.js";
import Reporter from "./log/reporter.js";
import FrameManagerAlert from "./frame_manager_alert.js";
import DeviceManagement from './ble/device';

const wifi = Wifi.instance;
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

        new Promise((resolve) => {
          Reporter.instance.start();
          Diskspace.instance.usage()
          .then(usage => {
            if(usage) Logger.identity({usage}, ["usage"]);
          })
          .catch(err => console.log(err) );
          //delay the answer to prevent any issue in this session - to improve, just exploring new features
          setTimeout(() => resolve(true), 5000);
        }).then(() => {
          var enocean = new EnoceanLoader();
          var server = new Server(enocean);
          var snmp = new SNMP();
          var push_web = new PushWEB();
          var discovery_service = new DiscoveryService();
          var ble = new BLE();
          var ssh = new SSH();
          var frame_manager_alert = new FrameManagerAlert();


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

          /*new Apt().list()
          .then(result => {
            Logger.data({
              packages: (result || "").split("\n").filter(s => s.indexOf("blue") >= 0 || s.indexOf("bootloader") >= 0),
              option: "bluetooth"
            });
          })
          .catch(err => Logger.error(err, "Error with bluetooth status"));*/

          /*const FIRMWARE = "raspberrypi-bootloader";
          const fn_upgradable: () => Promise<Upgradable> = () => {
            return new Apt().list()
            .then(result => (result || "").split("\n").find(s => s.indexOf(FIRMWARE) >= 0))
            .then(bootlader => ({
              upgradable: (bootlader||"").indexOf("upgradable") >= 0,
              version: bootlader || ""
            }))
          }*/


          /*const bluetooth_packages = ["bluez","bluez-firmware","pi-bluetooth"];
          const fn_upgradable_bluetooth: () => Promise<string[]> = () => {
            const to_upgrade = (lines: string[], pack: string) => !!(lines.find(line => (line.indexOf(pack+"/") >= 0) && (line.indexOf("upgradable") >= 0) ));

            return new Apt().list()
            .then(result => (result || "").split("\n"))
            .then(installed => bluetooth_packages.map(pack => to_upgrade(installed, pack) ? pack : ""))
            .then(to_update => to_update.filter(pack => pack.length > 0))
          }

          fn_upgradable_bluetooth()
          .then(to_update => {
            if(to_update.length == 0) return Promise.resolve(true);
            console.log("upgradable packages", {to_update});
            Logger.data({ to_update, bluetooth_packages });
            return new Apt().installs(to_update)
            .then(() => fn_upgradable_bluetooth())
            .then(to_update => {
              Logger.data({ to_update, bluetooth_packages });
              return to_update.length == 0;
            })
          })
          .catch(err => Logger.error(err, "Error with bootloader status"));*/

          /*fn_upgradable()
          .then(({upgradable, version}) => {
            console.log("upgradable", {upgradable, version});
            Logger.data({ upgradable, apt: version, option: FIRMWARE });

            if(!upgradable) {
              return true;
            } else {
              return new Apt().install(FIRMWARE)
              .then(() => fn_upgradable())
              .then(({upgradable, version}) => {
                Logger.data({ upgradable, apt: version, option: FIRMWARE });
                return upgradable;
              })
            }
          })
          .catch(err => Logger.error(err, "Error with bootloader status"));*/

          /*const which = new Which();
          which.which("hciconfig")
          .then(status => {
            Logger.data({service: "which", cmd:"hciconfig", status})
          })
          .then(res => {})
          .catch(err => Logger.error(err, "Error with hciconfig status"));*/

          /*exists("/bin/hciconfig")
          .then(ok => {
            if(ok) {
              Logger.data({service: "exists", cmd: "hciconfig", ok});
              return Promise.resolve(true);
            } else {
              Logger.data({service: "does_not_exists", cmd: "hciconfig", ok});
              return new Apt().install("armv7-bluez-osmc")
              .then(status => {
                Logger.data({service: "apt", cmd:"armv7-bluez-osmc", status});
                return which.which("hciconfig")
              })
              .then(status => {
                Logger.data({service: "which", cmd:"hciconfig", status})
                return true;
              })
            }
          })
          .then(res => bluetooth.hcistatus())
          .then(status => {
            Logger.data({service: "hciconfig", status})
            return bluetooth.up();
          })
          .then(res => console.log("hci dddonnnee ?"))
          .catch(err => Logger.error(err, "Error with hciconfig exists or armv7-bluez-osmc"));*/

          const bluetooth = new Bluetooth();
          bluetooth.status()
          .then(status => {
            Logger.data({service: "bluetooth", status})
            return bluetooth.start();
          })
          .then(res => {})
          .catch(err => Logger.error(err, "Error with bluetooth status"));

          wifi.start();
          server.start();
          snmp.connect();
          push_web.connect();
          //enocean.register(server);
          discovery_service.bind();
          ble.start();
          frame_manager_alert.start();
    

          if(ble.needRepair()) {
            new Cat()
            .exec("/etc/systemd/system/routair.service")
            .then(service => {
              return npm()
              .then(path => new Rebuild().exec("bluetooth-hci-socket", path))
              .then(rebuild => Logger.data({rebuild}))
              .catch(() => "")
              .then(rebuild => Logger.data({service, rebuild}));
            })
            .catch(err => Logger.error(err));
          }

          enocean.on("usb-open", (port: any) => {
            console.log("device opened and ready");
            server.emit("usb-open");
          });
    
          enocean.on("usb-closed", (port_instantiated: any) => {
            console.log("device removed");
            server.emit("usb-closed");
          });
    
          enocean.on("managed_frame", (frame: any) => {
            DeviceManagement.instance.onFrame(frame)
            .then(device => {
              console.log("device frame := ", {device: device?device.json() : undefined});
              push_web.onFrame(device, frame);
              ble.onFrame(device, frame);
            }).catch(err => Logger.error(err, "error in managed frame"));
            server.onFrame(frame);
            snmp.onFrame(frame);
          });
    
          enocean.on("frame", (frame: any) => {
          });

          enocean.init();
    
          snmp.on("log", (log: any) => {
            server.emit("log", log);
          });
        })
      });
    }
  }
}