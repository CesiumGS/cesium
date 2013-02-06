define("dojox/rpc/Service", ["dojo", "dojox", "dojo/AdapterRegistry", "dojo/_base/url"], function(dojo, dojox) {

dojo.declare("dojox.rpc.Service", null, {
	constructor: function(smd, options){
		// summary:
		//		Take a string as a url to retrieve an smd or an object that is an smd or partial smd to use
		//		as a definition for the service
		// description:
		//		dojox.rpc.Service must be loaded prior to any plugin services like dojox.rpc.Rest
		//		dojox.rpc.JsonRpc in order for them to register themselves, otherwise you get
		//		a "No match found" error.
		// smd: object
		//		Takes a number of properties as kwArgs for defining the service.  It also
		//		accepts a string.  When passed a string, it is treated as a url from
		//		which it should synchronously retrieve an smd file.  Otherwise it is a kwArgs
		//		object.  It accepts serviceUrl, to manually define a url for the rpc service
		//		allowing the rpc system to be used without an smd definition. strictArgChecks
		//		forces the system to verify that the # of arguments provided in a call
		//		matches those defined in the smd.  smdString allows a developer to pass
		//		a jsonString directly, which will be converted into an object or alternatively
		//		smdObject is accepts an smdObject directly.

		var url;
		var self = this;
		function processSmd(smd){
			smd._baseUrl = new dojo._Url((dojo.isBrowser ? location.href : dojo.config.baseUrl) ,url || '.') + '';
			self._smd = smd;

			//generate the methods
 			for(var serviceName in self._smd.services){
				var pieces = serviceName.split("."); // handle "namespaced" services by breaking apart by .
				var current = self;
				for(var i=0; i< pieces.length-1; i++){
					// create or reuse each object as we go down the chain
					current = current[pieces[i]] || (current[pieces[i]] = {});
				}
				current[pieces[pieces.length-1]]=	self._generateService(serviceName, self._smd.services[serviceName]);
 			}
		}
		if(smd){
			//ifthe arg is a string, we assume it is a url to retrieve an smd definition from
			if( (dojo.isString(smd)) || (smd instanceof dojo._Url)){
				if(smd instanceof dojo._Url){
					url = smd + "";
				}else{
					url = smd;
				}

				var text = dojo._getText(url);
				if(!text){
					throw new Error("Unable to load SMD from " + smd);
				}else{
					processSmd(dojo.fromJson(text));
				}
			}else{
				processSmd(smd);
			}
		}

		this._options = (options ? options : {});
		this._requestId = 0;
	},

	_generateService: function(serviceName, method){
		if(this[method]){
			throw new Error("WARNING: "+ serviceName+ " already exists for service. Unable to generate function");
		}
		method.name = serviceName;
		var func = dojo.hitch(this, "_executeMethod",method);
		var transport = dojox.rpc.transportRegistry.match(method.transport || this._smd.transport);
		if(transport.getExecutor){
			func = transport.getExecutor(func,method,this);
		}
		var schema = method.returns || (method._schema = {}); // define the schema
		var servicePath = '/' + serviceName +'/';
		// schemas are minimally used to track the id prefixes for the different services
		schema._service = func;
		func.servicePath = servicePath;
		func._schema = schema;
		func.id = dojox.rpc.Service._nextId++;
		return func;
	},
	_getRequest: function(method,args){
		var smd = this._smd;
		var envDef = dojox.rpc.envelopeRegistry.match(method.envelope || smd.envelope || "NONE");
		var parameters = (method.parameters || []).concat(smd.parameters || []);
		if(envDef.namedParams){
			// the serializer is expecting named params
			if((args.length==1) && dojo.isObject(args[0])){
				// looks like we have what we want
				args = args[0];
			}else{
				// they provided ordered, must convert
				var data={};
				for(var i=0;i<method.parameters.length;i++){
					if(typeof args[i] != "undefined" || !method.parameters[i].optional){
						data[method.parameters[i].name]=args[i];
					}
				}
				args = data;
			}
			if(method.strictParameters||smd.strictParameters){
				//remove any properties that were not defined
				for(i in args){
					var found=false;
					for(var j=0; j<parameters.length;j++){
						if(parameters[i].name==i){ found=true; }
					}
					if(!found){
						delete args[i];
					}
				}

			}
			// setting default values
			for(i=0; i< parameters.length; i++){
				var param = parameters[i];
				if(!param.optional && param.name && !args[param.name]){
					if(param["default"]){
						args[param.name] = param["default"];
					}else if(!(param.name in args)){
						throw new Error("Required parameter " + param.name + " was omitted");
					}
				}
			}
		}else if(parameters && parameters[0] && parameters[0].name && (args.length==1) && dojo.isObject(args[0])){
			// looks like named params, we will convert
			if(envDef.namedParams === false){
				// the serializer is expecting ordered params, must be ordered
				args = dojox.rpc.toOrdered(parameters, args);
			}else{
				// named is ok
				args = args[0];
			}
		}

		if(dojo.isObject(this._options)){
			args = dojo.mixin(args, this._options);
		}

		var schema = method._schema || method.returns; // serialize with the right schema for the context;
		var request = envDef.serialize.apply(this, [smd, method, args]);
		request._envDef = envDef;// save this for executeMethod
		var contentType = (method.contentType || smd.contentType || request.contentType);

		// this allows to mandate synchronous behavior from elsewhere when necessary, this may need to be changed to be one-shot in FF3 new sync handling model
		return dojo.mixin(request, {
			sync: dojox.rpc._sync,
			contentType: contentType,
			headers: method.headers || smd.headers || request.headers || {},
			target: request.target || dojox.rpc.getTarget(smd, method),
			transport: method.transport || smd.transport || request.transport,
			envelope: method.envelope || smd.envelope || request.envelope,
			timeout: method.timeout || smd.timeout,
			callbackParamName: method.callbackParamName || smd.callbackParamName,
			rpcObjectParamName: method.rpcObjectParamName || smd.rpcObjectParamName,
			schema: schema,
			handleAs: request.handleAs || "auto",
			preventCache: method.preventCache || smd.preventCache,
			frameDoc: this._options.frameDoc || undefined
		});
	},
	_executeMethod: function(method){
		var args = [];
		var i;
		for(i=1; i< arguments.length; i++){
			args.push(arguments[i]);
		}
		var request = this._getRequest(method,args);
		var deferred = dojox.rpc.transportRegistry.match(request.transport).fire(request);

		deferred.addBoth(function(results){
			return request._envDef.deserialize.call(this,results);
		});
		return deferred;
	}
});

dojox.rpc.getTarget = function(smd, method){
	var dest=smd._baseUrl;
	if(smd.target){
		dest = new dojo._Url(dest,smd.target) + '';
	}
	if(method.target){
		dest = new dojo._Url(dest,method.target) + '';
	}
	return dest;
};

dojox.rpc.toOrdered=function(parameters, args){
	if(dojo.isArray(args)){ return args; }
	var data=[];
	for(var i=0;i<parameters.length;i++){
		data.push(args[parameters[i].name]);
	}
	return data;
};

dojox.rpc.transportRegistry = new dojo.AdapterRegistry(true);
dojox.rpc.envelopeRegistry = new dojo.AdapterRegistry(true);
//Built In Envelopes

dojox.rpc.envelopeRegistry.register(
	"URL",
	function(str){ return str == "URL"; },
	{
		serialize:function(smd, method, data ){
			var d = dojo.objectToQuery(data);
			return {
				data: d,
				transport:"POST"
			};
		},
		deserialize:function(results){
			return results;
		},
		namedParams: true
	}
);

dojox.rpc.envelopeRegistry.register(
	"JSON",
	function(str){ return str == "JSON"; },
	{
		serialize: function(smd, method, data){
			var d = dojo.toJson(data);

			return {
				data: d,
				handleAs: 'json',
				contentType : 'application/json'
			};
		},
		deserialize: function(results){
			return results;
		}
	}
);
dojox.rpc.envelopeRegistry.register(
	"PATH",
	function(str){ return str == "PATH"; },
	{
		serialize:function(smd, method, data){
			var i;
			var target = dojox.rpc.getTarget(smd, method);
			if(dojo.isArray(data)){
				for(i = 0; i < data.length;i++){
					target += '/' + data[i];
				}
			}else{
				for(i in data){
					target += '/' + i + '/' + data[i];
				}
			}

			return {
				data:'',
				target: target
			};
		},
		deserialize:function(results){
			return results;
		}
	}
);



//post is registered first because it is the default;
dojox.rpc.transportRegistry.register(
	"POST",
	function(str){ return str == "POST"; },
	{
		fire:function(r){
			r.url = r.target;
			r.postData = r.data;
			return dojo.rawXhrPost(r);
		}
	}
);

dojox.rpc.transportRegistry.register(
	"GET",
	function(str){ return str == "GET"; },
	{
		fire: function(r){
			r.url=  r.target + (r.data ? '?' + ((r.rpcObjectParamName) ? r.rpcObjectParamName + '=' : '') + r.data : '');
			return dojo.xhrGet(r);
		}
	}
);


//only works ifyou include dojo.io.script
dojox.rpc.transportRegistry.register(
	"JSONP",
	function(str){ return str == "JSONP"; },
	{
		fire: function(r){
			r.url = r.target + ((r.target.indexOf("?") == -1) ? '?' : '&') + ((r.rpcObjectParamName) ? r.rpcObjectParamName + '=' : '') + r.data;
			r.callbackParamName = r.callbackParamName || "callback";
			return dojo.io.script.get(r);
		}
	}
);
dojox.rpc.Service._nextId = 1;

dojo._contentHandlers.auto = function(xhr){
	// automatically choose the right handler based on the returned content type
	var handlers = dojo._contentHandlers;
	var retContentType = xhr.getResponseHeader("Content-Type");
	var results = !retContentType ? handlers.text(xhr) :
		retContentType.match(/\/.*json/) ? handlers.json(xhr) :
		retContentType.match(/\/javascript/) ? handlers.javascript(xhr) :
		retContentType.match(/\/xml/) ? handlers.xml(xhr) : handlers.text(xhr);
	return results;
};

return dojox.rpc.Service;

});
