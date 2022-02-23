require("dotenv").config();

export interface MySQLConfig {
  host: string|undefined|null,
  user: string|undefined|null,
  password: string|undefined|null,
  database: string|undefined|null,
};

const config: MySQLConfig = {
  host : "127.0.0.1", //process.env.MYSQL_HOST,
  user : process.env.MYSQL_USER,
  password : process.env.MYSQL_PASSWORD,
  database : process.env.MYSQL_DATABASE
};

export default config;
