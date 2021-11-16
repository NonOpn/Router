import Pool from "../push_web/pool";
import Abstract from "../database/abstract.js";

const pool: Pool = Pool.instance;

pool.query("CREATE TABLE IF NOT EXISTS ConfigRows ("
  + "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,"
  + "`key` VARCHAR(255) NOT NULL,"
  + "`value` TEXT NOT NULL,"
  + "UNIQUE KEY `key` (`key`)"
  + ")ENGINE=MyISAM;")
.then(() => console.log("table creation finished"));

const MODEL = "ConfigRows";

function createInsertRows(): string {
  var columns = ["key","value"]
  columns = columns.map(function(col) {
    return "`"+col+"`";
  });
  return "INSERT INTO ConfigRows ("+columns.join(",")+") VALUES (?,?) ";
}

export interface Config {
  key: string;
  value: string|undefined;
}

export default class ConfigRows extends Abstract {
  getModelName () {
    return MODEL;
  }

  array(key: string, value: string): any[] {
    return [
      key,
      value
    ];
  }

  from(key: string, value: string): Config {
    return {
      key: key,
      value: value
    }
  }

  update(key: string, value: string): Promise<Config|undefined> {
    return new Promise((resolve, reject) => {
      pool.queryParameters("UPDATE ConfigRows SET `value` = ? WHERE `key` = ? ", [value, key])
      .then(results => resolve(results && results.length > 0 ? results[0] : undefined))
      .catch(err => reject(err));
    });
  }

  getKey(key: string): Promise<Config|undefined> {
    return new Promise((resolve, reject) => {
      pool.queryParameters("SELECT * FROM ConfigRows WHERE `key` = ? ", [key])
      .then(results => resolve(results && results.length > 0 ? results[0] : undefined))
      .catch(err => reject(err));
    });
  }

  save(key: string, value: string): Promise<Config|undefined> {
    return new Promise((resolve, reject) => {
      const tx = this.from(key, value);

      this.getKey(key)
      .then(item => {
        if(item) {
          this.update(key, value)
          .then(result => resolve(result))
          .catch(err => reject(err));
        } else {
          pool.queryParameters(createInsertRows(), [key, value])
          .then(() => resolve({key, value}))
          .catch(err => reject(err)); //TODO standardize pool error management
        }
      })
      .catch(err => reject(err));
    });
  }

}
