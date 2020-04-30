require("dotenv").config();

const wifi: any = process.env.WIFI_USB_ENABLED;

export interface WifiConfig {
  enabled: boolean
};

const config: WifiConfig = {
  enabled : wifi === "true" || wifi === true
};

export default config;