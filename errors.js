const request = require('request');
//error modification extracted from https://github.com/kgryte/utils-error-to-json
var CTORS = [
	[ TypeError, 'TypeError' ],
	[ SyntaxError, 'SyntaxError' ],
	[ ReferenceError, 'ReferenceError' ],
	[ RangeError, 'RangeError' ],
	[ URIError, 'URIError' ],
	[ EvalError, 'EvalError' ],
	[ Error, 'Error' ]
];

function typeName( error ) {
	var name = "UnknownError";
  CTORS.forEach(err => {
    if (error instanceof err[0] ) name = err[1];
  });
  return name;
}

function toJSON( err ) {
	var keys, out, i;

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

class Errors {
  postJsonError(err) {
  	if(err) {
  		request.post({
  			url: "https://contact-platform.com/api/ping",
  			json: {
  				error: toJSON(err),
					version: "999"
  			}
  		}, (e, response, body) => {
				var code = response ? response.statusCode : 200;
				if(e || code < 200 || code > 299) {
					console.log("store error");
				} else {
					console.log("error manager");
				}
  		});
  	}
  }
}

module.exports = new Errors();
