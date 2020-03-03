import Abstract from "../database/abstract.js";
export interface Config {
    key: string;
    value: string | undefined;
}
export default class ConfigRows extends Abstract {
    getModelName(): string;
    array(key: string, value: string): any[];
    from(key: string, value: string): Config;
    update(key: string, value: string): Promise<Config | undefined>;
    getKey(key: string): Promise<Config | undefined>;
    save(key: string, value: string): Promise<Config>;
}
