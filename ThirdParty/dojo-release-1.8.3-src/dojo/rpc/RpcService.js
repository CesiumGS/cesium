define([
	"../_base/array", "../_base/declare", "../_base/Deferred", "../_base/kernel","../_base/lang",
	"../_base/url", "../_base/xhr"
], function(array, declare, Deferred, kernel, lang, _Url, xhr){

// module:
//		dojo/rpc/RpcService

return declare("dojo.rpc.RpcService", null, {
	// summary:
	//		TODOC

	constructor: function(args){
		// summary:
		//		Take a string as a url to retrieve an smd or an object that is an smd or partial smd to use
		//		as a definition for the service
		//
		// args: object
		//		Takes a number of properties as kwArgs for defining the service.  It also
		//		accepts a string.  When passed a string, it is treated as a url from
		//		which it should synchronously retrieve an smd file.  Otherwise it is a kwArgs
		//		object.  It accepts serviceUrl, to manually define a url for the rpc service
		//		allowing the rpc system to be used without an smd definition. strictArgChecks
		//		forces the system to verify that the # of arguments provided in a call
		//		matches those defined in the smd.  smdString allows a developer to pass
		//		a jsonString directly, which will be converted into an object or alternatively
		//		smdObject is accepts an smdObject directly.
		//
		if(args){
			//if the arg is a string, we assume it is a url to retrieve an smd definition from
			if( (lang.isString(args)) || (args instanceof _Url)){
				if (args instanceof _Url){
					var url = args + "";
				}else{
					url = args;
				}
				var def = xhr.get({
					url: url,
					handleAs: "json-comment-optional",
					sync: true
				});

				def.addCallback(this, "processSmd");
				def.addErrback(function(){
					throw new Error("Unable to load SMD from " + args);
				});

			}else if(args.smdStr){
				this.processSmd(kernel.eval("("+args.smdStr+")"));
			}else{
				// otherwise we assume it's an arguments object with the following
				// (optional) properties:
				//		- serviceUrl
				//		- strictArgChecks
				//		- smdStr
				//		- smdObj

				if(args.serviceUrl){
					this.serviceUrl = args.serviceUrl;
				}

				this.timeout = args.timeout || 3000;

				if("strictArgChecks" in args){
					this.strictArgChecks = args.strictArgChecks;
				}

				this.processSmd(args);
			}
		}
	},

	strictArgChecks: true,
	serviceUrl: "",

	parseResults: function(obj){
		// summary:
		//		parse the results coming back from an rpc request.  this
		//		base implementation, just returns the full object
		//		subclasses should parse and only return the actual results
		// obj: Object
		//		Object that is the return results from an rpc request
		return obj;
	},

	errorCallback: function(/* dojo/_base/Deferred */ deferredRequestHandler){
		// summary:
		//		create callback that calls the Deferred errback method
		// deferredRequestHandler: Deferred
		//		The deferred object handling a request.
		return function(data){
			deferredRequestHandler.errback(data.message);
		};
	},

	resultCallback: function(/* dojo/_base/Deferred */ deferredRequestHandler){
		// summary:
		//		create callback that calls the Deferred's callback method
		// deferredRequestHandler: Deferred
		//		The deferred object handling a request.

		return lang.hitch(this,
			function(obj){
				if(obj.error!=null){
					var err;
					if(typeof obj.error == 'object'){
						err = new Error(obj.error.message);
						err.code = obj.error.code;
						err.error = obj.error.error;
					}else{
						err = new Error(obj.error);
					}
					err.id = obj.id;
					err.errorObject = obj;
					deferredRequestHandler.errback(err);
				}else{
					deferredRequestHandler.callback(this.parseResults(obj));
				}
			}
		);
	},

	generateMethod: function(/*string*/ method, /*array*/ parameters, /*string*/ url){
		// summary:
		//		generate the local bind methods for the remote object
		// method: string
		//		The name of the method we are generating
		// parameters: array
		//		the array of parameters for this call.
		// url: string
		//		the service url for this call

		return lang.hitch(this, function(){
			var deferredRequestHandler = new Deferred();

			// if params weren't specified, then we can assume it's varargs
			if( (this.strictArgChecks) &&
				(parameters != null) &&
				(arguments.length != parameters.length)
			){
				// put error stuff here, no enough params
				throw new Error("Invalid number of parameters for remote method.");
			}else{
				this.bind(method, lang._toArray(arguments), deferredRequestHandler, url);
			}

			return deferredRequestHandler;
		});
	},

	processSmd: function(object){
		// summary:
		//		callback method for receipt of a smd object.  Parse the smd
		//		and generate functions based on the description
		// object:
		//		smd object defining this service.

		if(object.methods){
			array.forEach(object.methods, function(m){
				if(m && m.name){
					this[m.name] = this.generateMethod(	m.name,
										m.parameters,
										m.url||m.serviceUrl||m.serviceURL);
					if(!lang.isFunction(this[m.name])){
						throw new Error("RpcService: Failed to create" + m.name + "()");
						/*console.log("RpcService: Failed to create", m.name, "()");*/
					}
				}
			}, this);
		}

		this.serviceUrl = object.serviceUrl||object.serviceURL;
		this.required = object.required;
		this.smd = object;
	}
});

});
