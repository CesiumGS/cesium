define([
	"dojo/_base/lang"
], function(lang){

	// module:
	//		dojox/mobile/dh/PatternFileTypeMap

	var o = {
		// summary:
		//		A component that provides a map for determining content-type from
		//		the pattern of the URL.
	};
	lang.setObject("dojox.mobile.dh.PatternFileTypeMap", o);

	o.map = {
		".*\.html": "html",
		".*\.json": "json"
	};

	o.add = function(/*String*/ key, /*String*/ contentType){
		// summary:
		//		Adds a handler class for the given content type.		
		this.map[key] = contentType;
	};

	o.getContentType = function(/*String*/ fileName){
		// summary:
		//		Returns the handler class for the given content type.		
		for(var key in this.map){
			if((new RegExp(key)).test(fileName)){
				return this.map[key];
			}
		}
		return null;
	};

	return o;
});
