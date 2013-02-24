define(["dojo", "dojox", "require", "dojox/data/JsonQueryRestStore", "dojox/rpc/Client", "dojo/_base/url"], function(dojo, dojox, require) {

// PersevereStore is an extension of JsonRestStore to handle Persevere's special features

dojox.json.ref.serializeFunctions = true; // Persevere supports persisted functions

dojo.declare("dojox.data.PersevereStore", dojox.data.JsonQueryRestStore,{
	useFullIdInQueries: true, // in JSONQuerys use the full id
	jsonQueryPagination: false // use the Range headers instead
});

dojox.data.PersevereStore.getStores = function(/*String?*/ path,/*Boolean?*/ sync){
	// summary:
	//		Creates Dojo data stores for all the table/classes on a Persevere server
	// path:
	//		URL of the Persevere server's root, this normally just "/"
	//		which is the default value if the target is not provided
	// sync:
	//		Indicates that the operation should happen synchronously.
	// returns:
	//		A map/object of datastores will be returned if it is performed asynchronously,
	//		otherwise it will return a Deferred object that will provide the map/object.
	//		The name of each property is a the name of a store,
	//		and the value is the actual data store object.
	path = (path && (path.match(/\/$/) ? path : (path + '/'))) || '/';
	if(path.match(/^\w*:\/\//)){
		// if it is cross-domain, we will use window.name for communication
		require("dojox/io/xhrScriptPlugin");
		dojox.io.xhrScriptPlugin(path, "callback", dojox.io.xhrPlugins.fullHttpAdapter);
	}
	var plainXhr = dojo.xhr;
	dojo.xhr = function(method,args){
		(args.headers = args.headers || {})['Server-Methods'] = "false";
		return plainXhr.apply(dojo,arguments);
	};
	var rootService= dojox.rpc.Rest(path,true);
	dojox.rpc._sync = sync;
	var dfd = rootService("Class/");//dojo.xhrGet({url: target, sync:!callback, handleAs:'json'});
	var results;
	var stores = {};
	var callId = 0;
	dfd.addCallback(function(schemas){
		dojox.json.ref.resolveJson(schemas, {
			index: dojox.rpc.Rest._index,
			idPrefix: "/Class/",
			assignAbsoluteIds: true
		});
		function setupHierarchy(schema){
			if(schema['extends'] && schema['extends'].prototype){
				if(!schema.prototype || !schema.prototype.isPrototypeOf(schema['extends'].prototype)){
					setupHierarchy(schema['extends']);
					dojox.rpc.Rest._index[schema.prototype.__id] = schema.prototype = dojo.mixin(dojo.delegate(schema['extends'].prototype), schema.prototype);
				}
			}
		}
		function setupMethods(methodsDefinitions, methodsTarget){
			if(methodsDefinitions && methodsTarget){
				for(var j in methodsDefinitions){
					var methodDef = methodsDefinitions[j];
					// if any method definitions indicate that the method should run on the server, than add
					// it to the prototype as a JSON-RPC method
					if(methodDef.runAt != "client" && !methodsTarget[j]){
						methodsTarget[j] = (function(methodName){
							return function(){
								// execute a JSON-RPC call
								var deferred = dojo.rawXhrPost({
									url: this.__id,
									// the JSON-RPC call
									postData: dojox.json.ref.toJson({
										method: methodName,
										id: callId++,
										params: dojo._toArray(arguments)
									}),
									handleAs: "json"
								});
								deferred.addCallback(function(response){
									// handle the response
									return response.error ?
										new Error(response.error) :
										response.result;
								});
								return deferred;
							}
						})(j);
					}
				}
			}
		}
		for(var i in schemas){
			if(typeof schemas[i] == 'object'){
				var schema = schemas[i];
				setupHierarchy(schema);
				setupMethods(schema.methods, schema.prototype = schema.prototype || {});
				setupMethods(schema.staticMethods, schema);
				stores[schemas[i].id] = new dojox.data.PersevereStore({target:new dojo._Url(path,schemas[i].id) + '/',schema:schema});
			}
		}
		return (results = stores);
	});
	dojo.xhr = plainXhr;
	return sync ? results : dfd;
};
dojox.data.PersevereStore.addProxy = function(){
	// summary:
	//		Invokes the XHR proxy plugin. Call this if you will be using x-site data.
	require("dojox/io/xhrPlugins"); // also not necessary, but we can register that Persevere supports proxying
	dojox.io.xhrPlugins.addProxy("/proxy/");
};

return dojox.data.PersevereStore;

});
