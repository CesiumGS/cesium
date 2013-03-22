dojo.provide("dojox.lang.functional.multirec");

dojo.require("dojox.lang.functional.lambda");
dojo.require("dojox.lang.functional.util");

// This module provides recursion combinators:
//	- a multi-way recursion combinator.

// Acknowledgements:
//	- recursion combinators are inspired by Manfred von Thun's article
//		"Recursion Theory and Joy"
//		(http://www.latrobe.edu.au/philosophy/phimvt/joy/j05cmp.html)

// Notes:
//	- recursion combinators produce a function, which implements
//	their respective recusion patterns. String lambdas are inlined, if possible.

(function(){
	var df = dojox.lang.functional, inline = df.inlineLambda,
		_x ="_x", _y_r_y_o = ["_y.r", "_y.o"];

	df.multirec = function(
					/*Function|String|Array*/ cond,
					/*Function|String|Array*/ then,
					/*Function|String|Array*/ before,
					/*Function|String|Array*/ after){
		// summary:
		//		Generates a function for the multi-way recursion pattern.
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
		//		the generated function recursively. Each member of the array should be
		//		an array of parameters. The length of it defines how many times
		//		the generated function is called recursively.
		// above:
		//		The lambda expression, which is called after the recursive step.
		//		It accepts two parameters: the array of returned values from recursive steps,
		//		and the original array of parameters used with all other functions.
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
			ts = "_t.apply(this, _x)";
		}
		if(typeof before == "string"){
			bs = inline(before, _x, add2dict);
		}else{
			b = df.lambda(before);
			bs = "_b.apply(this, _x)";
			dict2["_b=_t.b"] = 1;
		}
		if(typeof after == "string"){
			as = inline(after, _y_r_y_o, add2dict);
		}else{
			a = df.lambda(after);
			as = "_a.call(this, _y.r, _y.o)";
			dict2["_a=_t.a"] = 1;
		}
		var locals1 = df.keys(dict1), locals2 = df.keys(dict2),
			f = new Function([], "var _y={a:arguments},_x,_r,_z,_i".concat(	// Function
				locals1.length ? "," + locals1.join(",") : "",
				locals2.length ? ",_t=arguments.callee," + locals2.join(",") : "",
				t ? (locals2.length ? ",_t=_t.t" : "_t=arguments.callee.t") : "",
				";for(;;){for(;;){if(_y.o){_r=",
				as,
				";break}_x=_y.a;if(",
				cs,
				"){_r=",
				ts,
				";break}_y.o=_x;_x=",
				bs,
				";_y.r=[];_z=_y;for(_i=_x.length-1;_i>=0;--_i){_y={p:_y,a:_x[_i],z:_z}}}if(!(_z=_y.z)){return _r}_z.r.push(_r);_y=_y.p}"
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

var multirec1 = function(cond, then, before, after){
	var cond   = df.lambda(cond),
		then   = df.lambda(then),
		before = df.lambda(before),
		after  = df.lambda(after);
	return function(){
		if(cond.apply(this, arguments)){
			return then.apply(this, arguments);
		}
		var args = before.apply(this, arguments),
			ret  = new Array(args.length);
		for(var i = 0; i < args.length; ++i){
			ret[i] = arguments.callee.apply(this, args[i]);
		}
		return after.call(this, ret, arguments);
	};
};

2) The original iterative version (before minification and inlining):

var multirec2 = function(cond, then, before, after){
	var cond   = df.lambda(cond),
		then   = df.lambda(then),
		before = df.lambda(before),
		after  = df.lambda(after);
	return function(){
		var top = {args: arguments}, args, ret, parent, i;
		for(;;){
			for(;;){
				if(top.old){
					ret = after.call(this, top.ret, top.old);
					break;
				}
				args = top.args;
				if(cond.apply(this, args)){
					ret = then.apply(this, args);
					break;
				}
				top.old = args;
				args = before.apply(this, args);
				top.ret = [];
				parent = top;
				for(i = args.length - 1; i >= 0; --i){
					top = {prev: top, args: args[i], parent: parent};
				}
			}
			if(!(parent = top.parent)){
				return ret;
			}
			parent.ret.push(ret);
			top = top.prev;
		}
	};
};

*/
