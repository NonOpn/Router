import { Rebuild, Cat, npm, Bluetooth, Apt, Which, exists, AptCache } from './systemctl/index';
import EnoceanLoader from "./enocean.js";
import Server from "./server.js";
import BLE from "./ble";
import SNMP from "./snmp.js";
import PushWEB from "./push_web.js";
import DiscoveryService from "./discovery";
import Wifi from "./wifi/wifi.js";
import Errors from "./errors";
import { SSH, Network } from "./systemctl";
import { Logger } from "./log/index.js";
import { Diskspace } from "./system/index.js";
import Reporter from "./log/reporter.js";
import FrameManagerAlert from "./frame_manager_alert.js";
import DeviceManagement from './ble/device';

const wifi = Wifi.instance;

class App {
  constructor() {

  }

  start() {
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
      var network = new Network();
      var frame_manager_alert = new FrameManagerAlert();

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
  };
}

module.exports.App = App;