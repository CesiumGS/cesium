define([
   'require',
   './util',
   './handlers',
   '../errors/RequestTimeoutError',
   '../node!http',
   '../node!https',
   '../node!url',
   '../node!stream'/*=====,
	'../request',
	'../_base/declare' =====*/
], function(require, util, handlers, RequestTimeoutError, http, https, URL, stream/*=====, request, declare =====*/){
	var Stream = stream.Stream,
		undefined;

	var defaultOptions = {
		method: 'GET',
		query: null,
		data: undefined,
		headers: {}
	};
	function node(url, options){
		var response = util.parseArgs(url, util.deepCreate(defaultOptions, options), options && options.data instanceof Stream);
		url = response.url;
		options = response.options;

		var def = util.deferred(
			response,
			function(dfd, response){
				response.clientRequest.abort();
			}
		);

		url = URL.parse(url);

		var reqOptions = response.requestOptions = {
			hostname: url.hostname,
			port: url.port,
			socketPath: options.socketPath,
			method: options.method,
			headers: options.headers,
			agent: options.agent,
			pfx: options.pfx,
			key: options.key,
			passphrase: options.passphrase,
			cert: options.cert,
			ca: options.ca,
			ciphers: options.ciphers,
			rejectUnauthorized: options.rejectUnauthorized === false ? false : true
		};
		if(url.path){
			reqOptions.path = url.path;
		}
		if(options.user || options.password){
			reqOptions.auth = (options.user||'') + ':' + (options.password||'');
		}
		var req = response.clientRequest = (url.protocol === 'https:' ? https : http).request(reqOptions);

		if(options.socketOptions){
			if('timeout' in options.socketOptions){
				req.setTimeout(options.socketOptions.timeout);
			}
			if('noDelay' in options.socketOptions){
				req.setNoDelay(options.socketOptions.noDelay);
			}
			if('keepAlive' in options.socketOptions){
				var initialDelay = options.socketOptions.keepAlive;
				req.setKeepAlive(initialDelay >= 0, initialDelay || 0);
			}
		}

		req.on('socket', function(){
			response.hasSocket = true;
			def.progress(response);
		});

		req.on('response', function(clientResponse){
			response.clientResponse = clientResponse;
			response.status = clientResponse.statusCode;
			response.getHeader = function(headerName){
				return clientResponse.headers[headerName.toLowerCase()] || null;
			};

			var body = [];
			clientResponse.on('data', function(chunk){
				body.push(chunk);

				// TODO: progress updates via the deferred
			});
			clientResponse.on('end', function(){
				if(timeout){
					clearTimeout(timeout);
				}
				response.text = body.join('');
				handlers(response);
				def.resolve(response);
			});
		});

		req.on('error', def.reject);

		if(options.data){
			if(typeof options.data === "string"){
				req.end(options.data);
			}else{
				options.data.pipe(req);
			}
		}else{
			req.end();
		}

		if(options.timeout){
			var timeout = setTimeout(function(){
				def.cancel(new RequestTimeoutError(response));
			}, options.timeout);
		}

		return def.promise;
	}

	/*=====
	node = function(url, options){
		// summary:
		//		Sends a request using the included http or https interface from node.js
		//		with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/node.__Options?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	node.__BaseOptions = declare(request.__BaseOptions, {
		// data: String|Object|Stream?
		//		Data to transfer. This is ignored for GET and DELETE
		//		requests.
		// headers: Object?
		//		Headers to use for the request.
		// user: String?
		//		Username to use during the request.
		// password: String?
		//		Password to use during the request.
	});
	node.__MethodOptions = declare(null, {
		// method: String?
		//		The HTTP method to use to make the request. Must be
		//		uppercase. Default is `"GET"`.
	});
	node.__Options = declare([node.__BaseOptions, node.__MethodOptions]);

	node.get = function(url, options){
		// summary:
		//		Send an HTTP GET request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/node.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	node.post = function(url, options){
		// summary:
		//		Send an HTTP POST request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/node.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	node.put = function(url, options){
		// summary:
		//		Send an HTTP PUT request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/node.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	node.del = function(url, options){
		// summary:
		//		Send an HTTP DELETE request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/node.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	=====*/

	util.addCommonMethods(node);

	return node;
});
