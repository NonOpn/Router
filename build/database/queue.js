"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Queue {
    constructor() {
        this.waiting = [];
        this.waiting_for_one_call = false;
    }
    next() {
        console.log("calling next for ... " + this.waiting.length);
        if (this.waiting.length > 0) {
            this.waiting_for_one_call = true;
            const item = this.waiting.shift();
            if (!item) {
                console.log("finishing next calls... because undefined");
                this.waiting_for_one_call = false;
            }
            else {
                console.log("calling...");
                const { provider, resolve, reject } = item;
                const promise = provider();
                if (!promise) {
                    try {
                        throw "invalid promise obtained from provider call!";
                    }
                    catch (e) {
                        reject(e);
                    }
                }
                promise.then(data => {
                    resolve(data);
                    setTimeout(() => this.next(), 1);
                }).catch(e => {
                    reject(e);
                    setTimeout(() => this.next(), 1);
                });
            }
        }
        else {
            console.log("finishing next calls...");
            this.waiting_for_one_call = false;
        }
    }
    enqueue(provider) {
        return new Promise((resolve, reject) => {
            this.waiting.push({ provider, resolve, reject });
            if (!this.waiting_for_one_call) {
                this.next();
            }
            else {
                console.log("call pushed... but already in loop so it'll be waiting for");
            }
        });
    }
}
exports.default = Queue;
//# sourceMappingURL=queue.js.map