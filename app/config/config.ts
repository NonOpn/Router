var dotenv = undefined;
try {
  dotenv = require("dotenv");
  if(dotenv) dotenv.config();
} catch(e) {

}
const VERSION = "3.3.6";//process.env.VERSION || "1.0";

export interface Config {
  identity: string|undefined|null,
  version: string|undefined|null,
}

const config: Config = {
  "identity" : process.env.IDENTITY || "undefined",
  "version": VERSION
}

export default config;