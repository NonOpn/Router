import request from 'request';
//error modification extracted from https://github.com/kgryte/utils-error-to-json

interface Err {
  error: TypeErrorConstructor;
  name: string;
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

function toJSON( err: any ) {
	var keys, out: any, i;

	if ( !(err instanceof Error) ) {
		throw new TypeError( 'invalid input argument. Must provide an error object. Value: `' + err + '`.' );
	}
	out = {};

	out.type = typeName(err);
	out.message = err.message;

	if (err.name) out.name = err.name;
	if (err.stack) out.stack = err.stack;
	if (err.code) out.code = err.code;
	if (err.errno) out.errno = err.errno;
	if (err.syscall) out.syscall = err.syscall;

	keys = Object.keys(err);
	keys.forEach(key => (out[key] = err[key]));
	return out;
}

export default class Errors {
	static instance: Errors = new Errors();

	postJsonError(err: any) {
		this.postJsonErrorPromise(err)
		.then(val => console.log("val posted"))
		.catch(err => console.log("err obtained"));
	}
	
	postJsonErrorPromise(err: any) {
		return new Promise((resolve, reject) => {
			if(err) {
	  		request.post({
	  			url: "https://contact-platform.com/api/ping",
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
