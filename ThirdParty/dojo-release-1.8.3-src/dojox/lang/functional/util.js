dojo.provide("dojox.lang.functional.util");

dojo.require("dojox.lang.functional.lambda");

// This module provides helpers:
//	- inlining string lambda functions.

(function(){
	var df = dojox.lang.functional;

	dojo.mixin(df, {
		inlineLambda: function(/*String*/ lambda, /*String|Array*/ init, /*Function?*/ add2dict){
			// summary:
			//		Creates the inlined version of a string lambda.
			// lambda:
			//		The String variable representing the lambda function.
			// init:
			//		Conveys how to initialize parameters. If it is a String, then the apply() method
			//		would be emulated treating "init" as a list of input parameters.
			//		It it is an Array, then the call() method is emulated treating array members
			//		as input parameters.
			// add2dict:
			//		The optional function, which is used to record names of lambda parameters.
			//		If supplied, this function is called with a name of every parameter.

			var s = df.rawLambda(lambda);
			if(add2dict){
				df.forEach(s.args, add2dict);
			}
			var ap = typeof init == "string",	// apply or call?
				n = ap ? s.args.length : Math.min(s.args.length, init.length),
				a = new Array(4 * n + 4), i, j = 1;
			for(i = 0; i < n; ++i){
				a[j++] = s.args[i];
				a[j++] = "=";
				a[j++] = ap ? init + "[" + i + "]": init[i];
				a[j++] = ",";
			}
			a[0] = "(";
			a[j++] = "(";
			a[j++] = s.body;
			a[j] = "))";
			return a.join("");	// String
		}
	});
})();
