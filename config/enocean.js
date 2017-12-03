require("dotenv").config();

var json = {
  "enocean_endpoint" : process.env.ENOCEAN_ENDPOINT
};

//set default value
if(json.enocean_endpoint == undefined || json.enocean_endpoint.length < 3) {
  json.enocean_endpoint = undefined;
}

module.exports = json
