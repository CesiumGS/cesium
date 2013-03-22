dojo.provide("dojox.lang.aspect.memoizerGuard");

(function(){
	var aop = dojox.lang.aspect,
		reset = function(/*String|Array?*/ method){
			var that = aop.getContext().instance, t;
			if(!(t = that.__memoizerCache)){ return; }
			if(arguments.length == 0){
				delete that.__memoizerCache;
			}else if(dojo.isArray(method)){
				dojo.forEach(method, function(m){ delete t[m]; });
			}else{
				delete t[method];
			}
		};


	aop.memoizerGuard = function(/*String|Array?*/ method){
		// summary:
		//		Invalidates the memoizer's cache (see dojox.lang.aspect.memoizer)
		//		after calling certain methods.
		//
		// method:
		//		Optional method's name to be guarded: only cache for
		//		this method will be invalidated on call. Can be a string
		//		or an array of method names. If omitted the whole cache
		//		will be invalidated.

		return {	// Object
			after: function(){ reset(method); }
		};
	};
})();