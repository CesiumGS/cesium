define(["../main", "./RpcService", "../io/script"], function(dojo) {
	// module:
	//		dojo/rpc/JsonpService
	// summary:
	//		TODOC


dojo.declare("dojo.rpc.JsonpService", dojo.rpc.RpcService, {
	// summary:
	//	Generic JSONP service.  Minimally extends RpcService to allow
	//	easy definition of nearly any JSONP style service. Example
	//	SMD files exist in dojox.data

	constructor: function(args, requiredArgs){
		if(this.required) {
			if(requiredArgs){
				dojo.mixin(this.required, requiredArgs);
			}

			dojo.forEach(this.required, function(req){
				if(req=="" || req==undefined){
					throw new Error("Required Service Argument not found: "+req);
				}
			});
		}
	},

	strictArgChecks: false,

	bind: function(method, parameters, deferredRequestHandler, url){
		//summary:
		//              JSONP bind method. Takes remote method, parameters,
		//              deferred, and a url, calls createRequest to make a JSON-RPC
		//              envelope and passes that off with bind.
		//      method: string
		//              The name of the method we are calling
		//      parameters: array
		//              The parameters we are passing off to the method
		//      deferredRequestHandler: deferred
		//              The Deferred object for this particular request

		var def = dojo.io.script.get({
			url: url||this.serviceUrl,
			callbackParamName: this.callbackParamName||"callback",
			content: this.createRequest(parameters),
			timeout: this.timeout,
			handleAs: "json",
			preventCache: true
		});
		def.addCallbacks(this.resultCallback(deferredRequestHandler), this.errorCallback(deferredRequestHandler));
	},

	createRequest: function(parameters){
		// summary:
		//      create a JSONP req
		//      params: array
		//              The array of parameters for this request;

		var params = (dojo.isArrayLike(parameters) && parameters.length==1) ?
				parameters[0] : {};
		dojo.mixin(params,this.required);
		return params;
	}
});

return dojo.rpc.JsonpService;
});
