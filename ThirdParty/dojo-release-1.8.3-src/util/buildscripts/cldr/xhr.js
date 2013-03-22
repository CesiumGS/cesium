// Rhino-based replacement for dojo/_base/xhr (get only)
define(function(){
	return {
	    get: function(args){
		try {
		    args.load(readFile(args.url, "utf-8"));
		} catch (e) {
		    args.error();
		}
	    }
	}
});
