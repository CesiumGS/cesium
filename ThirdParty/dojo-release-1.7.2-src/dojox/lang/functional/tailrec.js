dojo.provide("dojox.lang.functional.tailrec");

dojo.require("dojox.lang.functional.lambda");
dojo.require("dojox.lang.functional.util");

// This module provides recursion combinators:
//	- a tail recursion combinator.

// Acknoledgements:
//	- recursion combinators are inspired by Manfred von Thun's article
//		"Recursion Theory and Joy"
//		(http://www.latrobe.edu.au/philosophy/phimvt/joy/j05cmp.html)

// Notes:
//	- recursion combinators produce a function, which implements
//	their respective recusion patterns. String lambdas are inlined, if possible.

(function(){
	var df = dojox.lang.functional, inline = df.inlineLambda, _x ="_x";

	df.tailrec = function(
					/*Function|String|Array*/ cond,
					/*Function|String|Array*/ then,
					/*Function|String|Array*/ before){
		// summary:
		//		Generates a function for the tail recursion pattern. This is the simplified
		//		version of the linear recursive combinator without the "after" function,
		//		and with the modified "before" function. All parameter functions are called
		//		in the context of "this" object.
		// cond:
		//		The lambda expression, which is used to detect the termination of recursion.
		//		It accepts the same parameter as the generated recursive function itself.
		//		This function should return "true", if the recursion should be stopped,
		//		and the "then" part should be executed. Otherwise the recursion will proceed.
		// then:
		//		The lambda expression, which is called upon termination of the recursion.
		//		It accepts the same parameters as the generated recursive function itself.
		//		The returned value will be returned as the value of the generated function.
		// before:
		//		The lambda expression, which is called before the recursive step.
		//		It accepts the same parameter as the generated recursive function itself,
		//		and returns an array of arguments for the next recursive call of
		//		the generated function.

		var c, t, b, cs, ts, bs, dict1 = {}, dict2 = {},
			add2dict = function(x){ dict1[x] = 1; };
		if(typeof cond == "string"){
			cs = inline(cond, _x, add2dict);
		}else{
			c = df.lambda(cond);
			cs = "_c.apply(this, _x)";
			dict2["_c=_t.c"] = 1;
		}
		if(typeof then == "string"){
			ts = inline(then, _x, add2dict);
		}else{
			t = df.lambda(then);
			ts = "_t.t.apply(this, _x)";
		}
		if(typeof before == "string"){
			bs = inline(before, _x, add2dict);
		}else{
			b = df.lambda(before);
			bs = "_b.apply(this, _x)";
			dict2["_b=_t.b"] = 1;
		}
		var locals1 = df.keys(dict1), locals2 = df.keys(dict2),
			f = new Function([], "var _x=arguments,_t=_x.callee,_c=_t.c,_b=_t.b".concat(	// Function
				locals1.length ? "," + locals1.join(",") : "",
				locals2.length ? ",_t=_x.callee," + locals2.join(",") : t ? ",_t=_x.callee" : "",
				";for(;!",
				cs,
				";_x=",
				bs,
				");return ",
				ts
			));
		if(c){ f.c = c; }
		if(t){ f.t = t; }
		if(b){ f.b = b; }
		return f;
	};
})();

/*
For documentation only:

1) The original recursive version:

var tailrec1 = function(cond, then, before){
	var cond   = df.lambda(cond),
		then   = df.lambda(then),
		before = df.lambda(before);
	return function(){
		if(cond.apply(this, arguments)){
			return then.apply(this, arguments);
		}
		var args = before.apply(this, arguments);
		return arguments.callee.apply(this, args);
	};
};

2) The original iterative version (before minification and inlining):

var tailrec2 = function(cond, then, before){
	var cond   = df.lambda(cond),
		then   = df.lambda(then),
		before = df.lambda(before);
	return function(){
		var args = arguments;
		for(; !cond.apply(this, args); args = before.apply(this, args));
		return then.apply(this, args);
	};
};

*/