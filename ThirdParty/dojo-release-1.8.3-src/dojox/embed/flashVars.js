define(["dojo"], function(dojo){

dojo.deprecated("dojox.embed.flashVars", "Will be removed in 2.0", "2.0");

var flashVars = {
	// summary:
	//		Handles flashvar serialization
	//		Converting complex objects into a simple, clear string that can be appended
	//		to the swf as a query: myMovie.swf?flashvars=foo.
	//		Note this needs to work with the SWF, which must know what variables to expect.
	//		Therefore this is something of an "internal" class - unless you know how to
	//		modify or create SWFs.
	//
	// description:
	//		JSON could be done, but Deft does not yet have a JSON parser, and quotes are
	//		very problematic since Flash cannot use eval(); JSON parsing was successful
	//		when it was fully escaped, but that made it very large anyway. flashvar
	//		serialization at most is 200% larger than JSON.
	//
	// See:
	//		Deft/common/flashVars.as
	//
	serialize: function(/* String */n, /*Object*/o){
		// summary:
		//		Key method. Serializes an object.
		// n: String
		//		The name for the object, such as: "button"
		// o: Object
		//		The object to serialize

		var esc = function(val){
			//	have to encode certain characters that indicate an object
			if(typeof val=="string"){
				val = val.replace(/;/g,"_sc_");
				val = val.replace(/\./g,"_pr_");
				val = val.replace(/\:/g,"_cl_");
				//val = escape(val);
			}
			return val;
		};
		var df = dojox.embed.flashVars.serialize;
		var txt = "";
		if(dojo.isArray(o)){
			for(var i=0;i<o.length;i++){
				txt += df(n+"."+i, esc(o[i]))+";";
			}
			return txt.replace(/;{2,}/g,";");
		}else if(dojo.isObject(o)){
			for(var nm in o){
				txt += df(n+"."+nm, esc(o[nm]))+";";
			}
			return txt.replace(/;{2,}/g,";");
		}
		// Dev note: important that there is no double semi-colons
		return n+":"+o; // String
	}
};

dojo.setObject("dojox.embed.flashVars", flashVars);

return flashVars;
});
