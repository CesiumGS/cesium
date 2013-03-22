dojo.provide("dojox.lang.functional.linrec");

dojo.require("dojox.lang.functional.lambda");
dojo.require("dojox.lang.functional.util");

// This module provides recursion combinators:
//	- a linear recursion combinator.

// Acknowledgements:
//	- recursion combinators are inspired by Manfred von Thun's article
//		"Recursion Theory and Joy"
//		(http://www.latrobe.edu.au/philosophy/phimvt/joy/j05cmp.html)

// Notes:
//	- recursion combinators produce a function, which implements
//	their respective recusion patterns. String lambdas are inlined, if possible.

(function(){
	var df = dojox.lang.functional, inline = df.inlineLambda,
		_x ="_x", _r_y_a = ["_r", "_y.a"];

	df.linrec = function(
					/*Function|String|Array*/ cond,
					/*Function|String|Array*/ then,
					/*Function|String|Array*/ before,
					/*Function|String|Array*/ after){
		// summary:
		//		Generates a function for the linear recursion pattern.
		//		All parameter functions are called in the context of "this" object.
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
		//		It accepts the same parameter as the generated recursive function itself.
		//		The returned value should be an array, which is used to call
		//		the generated function recursively.
		// above:
		//		The lambda expression, which is called after the recursive step.
		//		It accepts two parameters: the returned value from the recursive step, and
		//		the original array of parameters used with all other functions.
		//		The returned value will be returned as the value of the generated function.

		var c, t, b, a, cs, ts, bs, as, dict1 = {}, dict2 = {},
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
		if(typeof after == "string"){
			as = inline(after, _r_y_a, add2dict);
		}else{
			a = df.lambda(after);
			as = "_a.call(this, _r, _y.a)";
			dict2["_a=_t.a"] = 1;
		}
		var locals1 = df.keys(dict1), locals2 = df.keys(dict2),
			f = new Function([], "var _x=arguments,_y,_r".concat(	// Function
				locals1.length ? "," + locals1.join(",") : "",
				locals2.length ? ",_t=_x.callee," + locals2.join(",") : t ? ",_t=_x.callee" : "",
				";for(;!",
				cs,
				";_x=",
				bs,
				"){_y={p:_y,a:_x}}_r=",
				ts,
				";for(;_y;_y=_y.p){_r=",
				as,
				"}return _r"
			));
		if(c){ f.c = c; }
		if(t){ f.t = t; }
		if(b){ f.b = b; }
		if(a){ f.a = a; }
		return f;
	};
})();

/*
For documentation only:

1) The original recursive version:

var linrec1 = function(cond, then, before, after){
	var cond   = df.lambda(cond),
		then   = df.lambda(then),
		before = df.lambda(before),
		after  = df.lambda(after);
	return function(){
		if(cond.apply(this, arguments)){
			return then.apply(this, arguments);
		}
		var args = before.apply(this, arguments);
		var ret  = arguments.callee.apply(this, args);
		return after.call(this, ret, arguments);
	};
};

2) The original iterative version (before minification and inlining):

var linrec2 = function(cond, then, before, after){
	var cond   = df.lambda(cond),
		then   = df.lambda(then),
		before = df.lambda(before),
		after  = df.lambda(after);
	return function(){
		var args = arguments, top, ret;
		// 1st part
		for(; !cond.apply(this, args); args = before.apply(this, args)){
			top = {prev: top, args: args};
		}
		ret = then.apply(this, args);
		//2nd part
		for(; top; top = top.prev){
			ret = after.call(this, ret, top.args);
		}
		return ret;
	};
};

*/