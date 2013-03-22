dojo.provide("dojox.lang.aspect.cflow");


(function(){
	var aop = dojox.lang.aspect;
	
	aop.cflow = function(/*Object*/ instance, /*String|RegExp|Array?*/ method){
		// summary:
		//		Returns true if the context stack contains a context for a given
		//		instance that satisfies a given method name criteria.
		//
		// instance:
		//		An instance to be matched. If null, any context will be examined.
		//		Otherwise the context should belong to this instance.
		//
		// method:
		//		An optional pattern to be matched against a method name. Can be a string,
		//		a RegExp object or an array of strings and RegExp objects.
		//		If it is omitted, any name will satisfy the criteria.
	
		if(arguments.length > 1 && !(method instanceof Array)){
			method = [method];
		}
	
		var contextStack = aop.getContextStack();
		for(var i = contextStack.length - 1; i >= 0; --i){
			var c = contextStack[i];
			// check if instance matches
			if(instance && c.instance != instance){ continue; }
			if(!method){ return true; }
			var n = c.joinPoint.targetName;
			for(var j = method.length - 1; j >= 0; --j){
				var m = method[j];
				if(m instanceof RegExp){
					if(m.test(n)){ return true; }
				}else{
					if(n == m){ return true; }
				}
			}
		}
		return false;	// Boolean
	};
})();