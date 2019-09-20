require("dotenv").config();

const from_config: any = process.env.PUSH_WEB_ACTIVATED;

export interface JsonConfig {
  is_activated: boolean
};

var config: JsonConfig = {
  is_activated: "true" == from_config || from_config == true
};

export default config;