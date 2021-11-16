import request from 'request';
import config from "./config/config";
import { Logger } from './log/index';
import NetworkInfo from './network';
//error modification extracted from https://github.com/kgryte/utils-error-to-json

interface Err {
  error: TypeErrorConstructor;
  name: string;
  code?: number;
  errno?: number;
  syscall?: any;
}

var CTORS = [
  { error: TypeError, name: 'TypeError' },
  { error: SyntaxError, name: 'SyntaxError' },
  { error: ReferenceError, name: 'ReferenceError' },
  { error: RangeError, name: 'RangeError' },
  { error: URIError, name: 'URIError' },
  { error: EvalError, name: 'EvalError' },
  { error: Error, name: 'Error' }
];

function typeName( error: Error ) {
  var name: string = "UnknownError";
  CTORS.forEach(err => {
    if (error instanceof err.error ) name = err.name;
  });
  return name;
}

function toJSON( err: Err|any ) {
	var keys, out: any, i;

	out = {};

	out.type = typeName(err);
	out.message = err.message;

	if (err.name) out.name = err.name;
	if (err.stack) out.stack = err.stack;
	if (err.code) out.code = err.code;
	if (err.errno) out.errno = err.errno;
	if (err.syscall) out.syscall = err.syscall;

	if(config) {
		out.config = {
			identity: config.identity,
			version: config.version
		};
	}

	keys = Object.keys(err);
	keys.forEach(key => (out[key] = err[key]));
	return out;
}

export default class Errors {
	static instance: Errors = new Errors();

	postJsonError(err: any, reason: string|undefined = undefined) {
		!NetworkInfo.instance.isGPRS() && Logger.error(toJSON(err), reason);

		this.postJsonErrorPromise(err)
		.then(val => console.log("val posted"))
		.catch(err => console.log("err obtained"));
	}
	
	postJsonErrorPromise(err: any, reason: string|undefined = undefined) {
		!NetworkInfo.instance.isGPRS() && Logger.error(toJSON(err), reason);
		var scheme = NetworkInfo.instance.isGPRS() ? "http" : "https";

		return new Promise((resolve, reject) => {
			if(err) {
				request.post({
					url: `${scheme}://contact-platform.com/api/ping`,
					json: {
						error: toJSON(err),
						version: "999"
					}
				}, (e: any, response: any, body: any) => {
						var code = response ? response.statusCode : 200;
						if(e || code < 200 || code > 299) {
							console.log("store error");
						} else {
							console.log("error manager");
						}
						resolve(err);
				});
			} else {
				resolve(err);
			}
		})
  }
}
