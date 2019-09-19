require("dotenv").config();

const VERSION = "1.7";//process.env.VERSION || "1.0";

module.exports = {
  "identity" : process.env.IDENTITY,
  "version": VERSION
}
