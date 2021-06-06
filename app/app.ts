import { Rebuild, Cat, npm, Bluetooth, Apt, Which, exists, AptCache } from './systemctl/index';
import EnoceanLoader from "./enocean.js";
import Server from "./server.js";
import BLE from "./ble";
import SNMP from "./snmp.js";
import PushWEB from "./push_web.js";
import DiscoveryService from "./discovery";
import Wifi from "./wifi/wifi.js";
import { SSH, Network } from "./systemctl";
import { Logger } from "./log/index.js";
import { Diskspace } from "./system/index.js";
import Reporter from "./log/reporter.js";
import FrameManagerAlert from "./frame_manager_alert.js";
import DeviceManagement from './ble/device';
import NetworkInfo from './network';
import { logBLE } from './ble/safeBleno';
import Diagnostic from './diagnostic/Diagnostic';
import Errors from './errors';

const wifi = Wifi.instance;

class App {
  constructor() {

  }

  private safeStart(callback: () => void) {
    try {
      callback();
    } catch(e) {
      Errors.instance.postJsonError(e, "App::start");
      throw e;
    }
  }

  start() {
    try {
      Reporter.instance.start();

      var enocean = new EnoceanLoader();
      var server = new Server(enocean);
      var snmp = new SNMP();
      var push_web = new PushWEB();
      var discovery_service = new DiscoveryService();
      var ble = new BLE();
      var ssh = new SSH();
      var network = new Network();
      var frame_manager_alert = new FrameManagerAlert();

      this.safeStart(() => push_web.connect());
      this.safeStart(() => Diagnostic.start());
      this.safeStart(() => wifi.start());
      this.safeStart(() => server.start());
      this.safeStart(() => snmp.connect());
      this.safeStart(() => discovery_service.bind());
      this.safeStart(() => ble.start());
      this.safeStart(() => frame_manager_alert.start());
      //enocean.register(server);

      network.ifup("eth0").then(() => console.log("eth0 up")).catch(err => console.log(err));

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

      const bluetooth = new Bluetooth();
      bluetooth.status()
      .then(status => {
        if(!NetworkInfo.instance.isGPRS()) {
          Logger.data({service: "bluetooth", status})
        }
        return bluetooth.start();
      })
      .then(res => {})
      .catch(err => !NetworkInfo.instance.isGPRS() && Logger.error(err, "Error with bluetooth status"));

      // make sure the interface is up
      bluetooth.up().then(() => {
        logBLE({status: "up"});
      }).catch(err => {
        if(!NetworkInfo.instance.isGPRS()) Logger.error(err, "ble_up");
      });

      wifi.disableDNSMasq().then(() => {}).catch(() => {});

      if(ble.needRepair()) {
        new Cat()
        .exec("/etc/systemd/system/routair.service")
        .then(service => {
          return npm()
          .then(path => new Rebuild().exec("bluetooth-hci-socket", path))
          .catch(() => "");
        })
        .catch(err => !NetworkInfo.instance.isGPRS() && Logger.error(err));
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
          console.log("device frame := ", {device: device ? device.json() : undefined});
          push_web.onFrame(device, frame);
          ble.onFrame(device, frame);
        }).catch(err => !NetworkInfo.instance.isGPRS() && Logger.error(err, "error in managed frame"));
        server.onFrame(frame);
        snmp.onFrame(frame);
      });

      enocean.on("frame", (frame: any) => {
      });

      this.safeStart(() => enocean.init());

      snmp.on("log", (log: any) => {
        server.emit("log", log);
      });
    } catch(e) {
      Errors.instance.postJsonError(e, "App::start");
      throw e;
    }
  };
}

module.exports.App = App;