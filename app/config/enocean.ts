require("dotenv").config();

export interface EnoceanConfig {
  enocean_endpoint: string|null|undefined
}

const json: EnoceanConfig = { enocean_endpoint : process.env.ENOCEAN_ENDPOINT };

//set default value
if(json.enocean_endpoint == undefined || json.enocean_endpoint.length < 3) {
  json.enocean_endpoint = undefined;
}

export default json;