require("dotenv").config();

export interface VisualisationConfig {
  login: string|undefined|null,
  password: string|undefined|null,
  port: string|undefined|null
};

const config: VisualisationConfig = {
  login : process.env.VISUALISATION_LOGIN,
  password : process.env.VISUALISATION_PASSWORD,
  port : process.env.VISUALISATION_PORT
};

export default config;