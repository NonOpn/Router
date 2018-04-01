require("dotenv").config();

const VERSION = process.env.VERSION || "1.0";

module.exports = {
  "identity" : process.env.IDENTITY,
  "version": VERSION
}
