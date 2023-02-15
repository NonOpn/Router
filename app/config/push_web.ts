var dotenv = undefined;
try {
  dotenv = require("dotenv");
  if(dotenv) dotenv.config();
} catch(e) {

}
const from_config: any = process.env.PUSH_WEB_ACTIVATED;

export interface JsonConfig {
  is_activated: boolean
};

var config: JsonConfig = {
  is_activated: "false" != from_config && from_config != false
};

export default config;