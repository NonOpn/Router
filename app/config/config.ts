require("dotenv").config();

const VERSION = "1.12";//process.env.VERSION || "1.0";

export interface Config {
  identity: string|undefined|null,
  version: string|undefined|null,
}

const config: Config = {
  "identity" : process.env.IDENTITY,
  "version": VERSION
}

export default config;