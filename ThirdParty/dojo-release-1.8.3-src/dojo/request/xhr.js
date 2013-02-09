define([
	'../errors/RequestError',
	'./watch',
	'./handlers',
	'./util',
	'../has'/*=====,
	'../request',
	'../_base/declare' =====*/
], function(RequestError, watch, handlers, util, has/*=====, request, declare =====*/){
	has.add('native-xhr', function(){
		// if true, the environment has a native XHR implementation
		return typeof XMLHttpRequest !== 'undefined';
	});
	has.add('dojo-force-activex-xhr', function(){
		return has('activex') && !document.addEventListener && window.location.protocol === 'file:';
	});

	has.add('native-xhr2', function(){
		if(!has('native-xhr')){ return; }
		var x = new XMLHttpRequest();
		return typeof x['addEventListener'] !== 'undefined' &&
			(typeof opera === 'undefined' || typeof x['upload'] !== 'undefined');
	});

	has.add('native-formdata', function(){
		// if true, the environment has a native FormData implementation
		return typeof FormData === 'function';
	});

	function handleResponse(response, error){
		var _xhr = response.xhr;
		response.status = response.xhr.status;
		response.text = _xhr.responseText;

		if(response.options.handleAs === 'xml'){
			response.data = _xhr.responseXML;
		}

		if(!error){
			try{
				handlers(response);
			}catch(e){
				error = e;
			}
		}

		if(error){
			this.reject(error);
		}else if(util.checkStatus(_xhr.status)){
			this.resolve(response);
		}else{
			error = new RequestError('Unable to load ' + response.url + ' status: ' + _xhr.status, response);

			this.reject(error);
		}
	}

	var isValid, isReady, addListeners, cancel;
	if(has('native-xhr2')){
		// Any platform with XHR2 will only use the watch mechanism for timeout.

		isValid = function(response){
			// summary:
			//		Check to see if the request should be taken out of the watch queue
			return !this.isFulfilled();
		};
		cancel = function(dfd, response){
			// summary:
			//		Canceler for deferred
			response.xhr.abort();
		};
		addListeners = function(_xhr, dfd, response){
			// summary:
			//		Adds event listeners to the XMLHttpRequest object
			function onLoad(evt){
				dfd.handleResponse(response);
			}
			function onError(evt){
				var _xhr = evt.target;
				var error = new RequestError('Unable to load ' + response.url + ' status: ' + _xhr.status, response); 
				dfd.handleResponse(response, error);
			}

			function onProgress(evt){
				if(evt.lengthComputable){
					response.loaded = evt.loaded;
					response.total = evt.total;
					dfd.progress(response);
				}
			}

			_xhr.addEventListener('load', onLoad, false);
			_xhr.addEventListener('error', onError, false);
			_xhr.addEventListener('progress', onProgress, false);

			return function(){
				_xhr.removeEventListener('load', onLoad, false);
				_xhr.removeEventListener('error', onError, false);
				_xhr.removeEventListener('progress', onProgress, false);
			};
		};
	}else{
		isValid = function(response){
			return response.xhr.readyState; //boolean
		};
		isReady = function(response){
			return 4 === response.xhr.readyState; //boolean
		};
		cancel = function(dfd, response){
			// summary:
			//		canceller function for util.deferred call.
			var xhr = response.xhr;
			var _at = typeof xhr.abort;
			if(_at === 'function' || _at === 'object' || _at === 'unknown'){
				xhr.abort();
			}
		};
	}

	var undefined,
		defaultOptions = {
			data: null,
			query: null,
			sync: false,
			method: 'GET',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		};
	function xhr(url, options, returnDeferred){
		var response = util.parseArgs(
			url,
			util.deepCreate(defaultOptions, options),
			has('native-formdata') && options && options.data && options.data instanceof FormData
		);
		url = response.url;
		options = response.options;

		var remover,
			last = function(){
				remover && remover();
			};

		//Make the Deferred object for this xhr request.
		var dfd = util.deferred(
			response,
			cancel,
			isValid,
			isReady,
			handleResponse,
			last
		);
		var _xhr = response.xhr = xhr._create();

		if(!_xhr){
			// If XHR factory somehow returns nothings,
			// cancel the deferred.
			dfd.cancel(new RequestError('XHR was not created'));
			return returnDeferred ? dfd : dfd.promise;
		}

		response.getHeader = function(headerName){
			return this.xhr.getResponseHeader(headerName);
		};

		if(addListeners){
			remover = addListeners(_xhr, dfd, response);
		}

		var data = options.data,
			async = !options.sync,
			method = options.method;

		try{
			// IE6 won't let you call apply() on the native function.
			_xhr.open(method, url, async, options.user || undefined, options.password || undefined);

			if(options.withCredentials){
				_xhr.withCredentials = options.withCredentials;
			}

			var headers = options.headers,
				contentType;
			if(headers){
				for(var hdr in headers){
					if(hdr.toLowerCase() === 'content-type'){
						contentType = headers[hdr];
					}else if(headers[hdr]){
						//Only add header if it has a value. This allows for instance, skipping
						//insertion of X-Requested-With by specifying empty value.
						_xhr.setRequestHeader(hdr, headers[hdr]);
					}
				}
			}

			if(contentType && contentType !== false){
				_xhr.setRequestHeader('Content-Type', contentType);
			}
			if(!headers || !('X-Requested-With' in headers)){
				_xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
			}

			if(util.notify){
				util.notify.emit('send', response, dfd.promise.cancel);
			}
			_xhr.send(data);
		}catch(e){
			dfd.reject(e);
		}

		watch(dfd);
		_xhr = null;

		return returnDeferred ? dfd : dfd.promise;
	}

	/*=====
	xhr = function(url, options){
		// summary:
		//		Sends a request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/xhr.__Options?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	xhr.__BaseOptions = declare(request.__BaseOptions, {
		// sync: Boolean?
		//		Whether to make a synchronous request or not. Default
		//		is `false` (asynchronous).
		// data: String|Object|FormData?
		//		Data to transfer. This is ignored for GET and DELETE
		//		requests.
		// headers: Object?
		//		Headers to use for the request.
		// user: String?
		//		Username to use during the request.
		// password: String?
		//		Password to use during the request.
		// withCredentials: Boolean?
		//		For cross-site requests, whether to send credentials
		//		or not.
	});
	xhr.__MethodOptions = declare(null, {
		// method: String?
		//		The HTTP method to use to make the request. Must be
		//		uppercase. Default is `"GET"`.
	});
	xhr.__Options = declare([xhr.__BaseOptions, xhr.__MethodOptions]);

	xhr.get = function(url, options){
		// summary:
		//		Send an HTTP GET request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/xhr.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	xhr.post = function(url, options){
		// summary:
		//		Send an HTTP POST request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/xhr.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	xhr.put = function(url, options){
		// summary:
		//		Send an HTTP PUT request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/xhr.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	xhr.del = function(url, options){
		// summary:
		//		Send an HTTP DELETE request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/xhr.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	=====*/
	xhr._create = function(){
		// summary:
		//		does the work of portably generating a new XMLHTTPRequest object.
		throw new Error('XMLHTTP not available');
	};
	if(has('native-xhr') && !has('dojo-force-activex-xhr')){
		xhr._create = function(){
			return new XMLHttpRequest();
		};
	}else if(has('activex')){
		try{
			new ActiveXObject('Msxml2.XMLHTTP');
			xhr._create = function(){
				return new ActiveXObject('Msxml2.XMLHTTP');
			};
		}catch(e){
			try{
				new ActiveXObject('Microsoft.XMLHTTP');
				xhr._create = function(){
					return new ActiveXObject('Microsoft.XMLHTTP');
				};
			}catch(e){}
		}
	}

	util.addCommonMethods(xhr);

	return xhr;
});
