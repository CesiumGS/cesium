dojo.provide("dojox.wire.ml.JsonHandler");

dojo.require("dojox.wire.ml.RestHandler");
dojo.require("dojox.wire._base");
dojo.require("dojox.wire.ml.util");


dojo.declare("dojox.wire.ml.JsonHandler", dojox.wire.ml.RestHandler, {
	// summary:
	//		A REST service handler for JSON
	// description:
	//		This class provides JSON handling for a REST service.
	contentType: "text/json",
	handleAs: "json",
	headers: {"Accept": "*/json"},

	_getContent: function(/*String*/method, /*Array*/parameters){
		// summary:
		//		Generate a request content
		// description:
		//		If 'method' is "POST" or "PUT", the first parameter in
		//		'parameter' is used to generate a JSON content.
		// method:
		//		A method name
		// parameters:
		//		An array of parameters
		// returns:
		//		A request content
		var content = null;
		if(method == "POST" || method == "PUT"){
			var p = (parameters ? parameters[0] : undefined);
			if(p){
				if(dojo.isString(p)){
					content = p;
				}else{
					content = dojo.toJson(p);
				}
			}
		}
		return content; //String
	}
});
