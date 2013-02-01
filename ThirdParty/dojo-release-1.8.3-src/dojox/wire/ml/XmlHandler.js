dojo.provide("dojox.wire.ml.XmlHandler");

dojo.require("dojox.wire.ml.RestHandler");
dojo.require("dojox.xml.parser");
dojo.require("dojox.wire._base");
dojo.require("dojox.wire.ml.util");


dojo.declare("dojox.wire.ml.XmlHandler", dojox.wire.ml.RestHandler, {
	// summary:
	//		A REST service handler for XML
	// description:
	//		This class provides XML handling for a REST service.

	contentType: "text/xml",
	handleAs: "xml",

	_getContent: function(/*String*/method, /*Array*/parameters){
		// description:
		//		If 'method' is "POST" or "PUT", the first parameter in
		//		'parameters' is used to generate an XML content.
		// method:
		//		A method name
		// parameters:
		//		An array of parameters
		// returns:
		//		A request content
		var content = null;
		if(method == "POST" || method == "PUT"){
			var p = parameters[0];
			if(p){
				if(dojo.isString(p)){
					content = p;
				}else{
					var element = p;
					if(element instanceof dojox.wire.ml.XmlElement){
						element = element.element;
					}else if(element.nodeType === 9 /* DOCUMENT_NODE */){
						element = element.documentElement;
					}
					var declaration = "<?xml version=\"1.0\"?>"; // TODO: encoding?
					content = declaration + dojox.xml.parser.innerXML(element);
				}
			}
		}
		return content;
	},

	_getResult: function(/*Document*/data){
		// summary:
		//		Extract a result
		// description:
		//		A response data (XML Document) is returned wrapped with
		//		XmlElement.
		// data:
		//		A response data returned by a service
		// returns:
		//		A result object
		if(data){
			data = new dojox.wire.ml.XmlElement(data);
		}
		return data;
	}
});
