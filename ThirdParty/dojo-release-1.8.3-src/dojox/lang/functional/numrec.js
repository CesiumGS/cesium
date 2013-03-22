dojo.provide("dojox.lang.functional.numrec");

dojo.require("dojox.lang.functional.lambda");
dojo.require("dojox.lang.functional.util");

// This module provides recursion combinators:
//	- a simplified numeric linear recursion combinator.

// Acknowledgements:
//	- recursion combinators are inspired by Manfred von Thun's article
//		"Recursion Theory and Joy"
//		(http://www.latrobe.edu.au/philosophy/phimvt/joy/j05cmp.html)

// Notes:
//	- recursion combinators produce a function, which implements
//	their respective recusion patterns. String lambdas are inlined, if possible.

(function(){
	var df = dojox.lang.functional, inline = df.inlineLambda,
		_r_i = ["_r", "_i"];

	df.numrec = function(/*Object*/ then, /*Function|String|Array*/ after){
		// summary:
		//		Generates a function for the simplified numeric linear recursion pattern.
		//		All parameter functions are called in the context of "this" object.
		// description:
		//		This is a simplification of the linear recursion combinator:
		//		- the generated function takes one numeric parameter "x",
		//		- the "cond" is fixed and checks for 0.
		//		- the "before" is fixed and the generated function is called with "x - 1".
		//		- the "above is called with two parameters: the return from the generated
		//		function, and with "x".
		//		- as you can see the recursion is done by decreasing the parameter,
		//		and calling itself until it reaches 0.
		// then:
		//		The value, which is used upon termination of the recursion.
		//		It will be returned as the value of the generated function.
		// above:
		//		The lambda expression, which is called after the recursive step.
		//		It accepts two parameters: the returned value from the recursive step, and
		//		the original parameter. The returned value will be returned as the value of
		//		the generated function.

		var a, as, dict = {},
			add2dict = function(x){ dict[x] = 1; };
		if(typeof after == "string"){
			as = inline(after, _r_i, add2dict);
		}else{
			a = df.lambda(after);
			as = "_a.call(this, _r, _i)";
		}
		var locals = df.keys(dict),
			f = new Function(["_x"], "var _t=arguments.callee,_r=_t.t,_i".concat(	// Function
				locals.length ? "," + locals.join(",") : "",
				a ? ",_a=_t.a" : "",
				";for(_i=1;_i<=_x;++_i){_r=",
				as,
				"}return _r"
			));
		f.t = then;
		if(a){ f.a = a; }
		return f;
	};
})();

/*
For documentation only:

1) The original recursive version:

var numrec1 = function(then, after){
	var after = df.lambda(after);
	return function(x){
		return x ? after.call(this, arguments.callee.call(this, x - 1), x) : then;
	};
};

2) The original iterative version (before minification and inlining):

var numrec2 = function(then, after){
	var after = df.lambda(after);
	return function(x){
		var ret = then, i;
		for(i = 1; i <= x; ++i){
			ret = after.call(this, ret, i);
		}
		return ret;
	};
};

*/