require("dotenv").config();

var json = {
  "is_activated" : process.env.PUSH_WEB_ACTIVATED
};

//set default value
json.is_activated = json.is_activated == "true" || json.is_activated == true;

module.exports = json
