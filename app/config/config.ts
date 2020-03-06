require("dotenv").config();

const VERSION = "2.0";//process.env.VERSION || "1.0";

export interface Config {
  identity: string|undefined|null,
  version: string|undefined|null,
}

const config: Config = {
  "identity" : process.env.IDENTITY,
  "version": VERSION
}

export default config;