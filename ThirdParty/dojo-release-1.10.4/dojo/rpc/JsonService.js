define([
	"../_base/declare", "../_base/Deferred", "../_base/json", "../_base/lang", "../_base/xhr",
	"./RpcService"
], function(declare, Deferred, json, lang, xhr, RpcService){

	// module:
	//		dojo/rpc/JsonService

	return declare("dojo.rpc.JsonService", RpcService, {
		// summary:
		//		TODOC

		bustCache: false,
		contentType: "application/json-rpc",
		lastSubmissionId: 0,

		callRemote: function(method, params){
			// summary:
			//		call an arbitrary remote method without requiring it to be
			//		predefined with SMD
			// method: string
			//		the name of the remote method you want to call.
			// params: array
			//		array of parameters to pass to method

			var deferred = new Deferred();
			this.bind(method, params, deferred);
			return deferred;
		},

		bind: function(method, parameters, deferredRequestHandler, url){
			// summary:
			//		JSON-RPC bind method. Takes remote method, parameters,
			//		deferred, and a url, calls createRequest to make a JSON-RPC
			//		envelope and passes that off with bind.
			// method: string
			//		The name of the method we are calling
			// parameters: array
			//		The parameters we are passing off to the method
			// deferredRequestHandler: deferred
			//		The Deferred object for this particular request

			var def = xhr.post({
				url: url||this.serviceUrl,
				postData: this.createRequest(method, parameters),
				contentType: this.contentType,
				timeout: this.timeout,
				handleAs: "json-comment-optional"
			});
			def.addCallbacks(this.resultCallback(deferredRequestHandler), this.errorCallback(deferredRequestHandler));
		},

		createRequest: function(method, params){
			// summary:
			//		create a JSON-RPC envelope for the request
			// method: string
			//		The name of the method we are creating the request for
			// params: array
			//		The array of parameters for this request

			var req = { "params": params, "method": method, "id": ++this.lastSubmissionId };
			return json.toJson(req);
		},

		parseResults: function(/*anything*/obj){
			// summary:
			//		parse the result envelope and pass the results back to
			//		the callback function
			// obj: Object
			//		Object containing envelope of data we receive from the server

			if(lang.isObject(obj)){
				if("result" in obj){
					return obj.result;
				}
				if("Result" in obj){
					return obj.Result;
				}
				if("ResultSet" in obj){
					return obj.ResultSet;
				}
			}
			return obj;
		}
	});

});
