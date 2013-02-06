dojo.provide("dojox.lang.aspect.memoizer");

(function(){
	var aop = dojox.lang.aspect;

	var memoize1 = {
		around: function(key){
			var ctx = aop.getContext(), self = ctx.joinPoint, that = ctx.instance, t, u, ret;
			if((t = that.__memoizerCache) && (t = t[self.targetName]) && (key in t)){
				return t[key];
			}
			var ret = aop.proceed.apply(null, arguments);
			if(!(t = that.__memoizerCache)){ t = that.__memoizerCache = {}; }
			if(!(u = t[self.targetName])){ u = t[self.targetName] = {}; }
			return u[key] = ret;
		}
	};

	var memoizeN = function(/*Function*/keyMaker){
		return {
			around: function(/*arguments*/){
				var ctx = aop.getContext(), self = ctx.joinPoint, that = ctx.instance, t, u, ret,
					key  = keyMaker.apply(that, arguments);
				if((t = that.__memoizerCache) && (t = t[self.targetName]) && (key in t)){
					return t[key];
				}
				var ret = aop.proceed.apply(null, arguments);
				if(!(t = that.__memoizerCache)){ t = that.__memoizerCache = {}; }
				if(!(u = t[self.targetName])){ u = t[self.targetName] = {}; }
				return u[key] = ret;
			}
		};
	};

	aop.memoizer = function(/*Function?*/ keyMaker){
		// summary:
		//		Returns an object, which can be used to count calls to methods.
		//
		// keyMaker:
		//		the function, which takes method's arguments and returns a key,
		//		which can be used to index the result.

		return arguments.length == 0 ? memoize1 : memoizeN(keyMaker);	// Object
	};
})();