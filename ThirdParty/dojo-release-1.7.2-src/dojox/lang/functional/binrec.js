dojo.provide("dojox.lang.functional.binrec");

dojo.require("dojox.lang.functional.lambda");
dojo.require("dojox.lang.functional.util");

// This module provides recursion combinators:
//	- a binary recursion combinator.

// Acknoledgements:
//	- recursion combinators are inspired by Manfred von Thun's article
//		"Recursion Theory and Joy"
//		(http://www.latrobe.edu.au/philosophy/phimvt/joy/j05cmp.html)

// Notes:
//	- recursion combinators produce a function, which implements
//	their respective recusion patterns. String lambdas are inlined, if possible.

(function(){
	var df = dojox.lang.functional, inline = df.inlineLambda,
		_x ="_x", _z_r_r_z_a = ["_z.r", "_r", "_z.a"];

	df.binrec = function(
					/*Function|String|Array*/ cond,
					/*Function|String|Array*/ then,
					/*Function|String|Array*/ before,
					/*Function|String|Array*/ after){
		// summary:
		//		Generates a function for the binary recursion pattern.
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
		//		The returned value should be an array of two variable, which are used to call
		//		the generated function recursively twice in row starting from the first item.
		// above:
		//		The lambda expression, which is called after the recursive step.
		//		It accepts three parameters: two returned values from recursive steps, and
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
			as = inline(after, _z_r_r_z_a, add2dict);
		}else{
			a = df.lambda(after);
			as = "_a.call(this, _z.r, _r, _z.a)";
			dict2["_a=_t.a"] = 1;
		}
		var locals1 = df.keys(dict1), locals2 = df.keys(dict2),
			f = new Function([], "var _x=arguments,_y,_z,_r".concat(	// Function
				locals1.length ? "," + locals1.join(",") : "",
				locals2.length ? ",_t=_x.callee," + locals2.join(",") : "",
				t ? (locals2.length ? ",_t=_t.t" : "_t=_x.callee.t") : "",
				";while(!",
				cs,
				"){_r=",
				bs,
				";_y={p:_y,a:_r[1]};_z={p:_z,a:_x};_x=_r[0]}for(;;){do{_r=",
				ts,
				";if(!_z)return _r;while(\"r\" in _z){_r=",
				as,
				";if(!(_z=_z.p))return _r}_z.r=_r;_x=_y.a;_y=_y.p}while(",
				cs,
				");do{_r=",
				bs,
				";_y={p:_y,a:_r[1]};_z={p:_z,a:_x};_x=_r[0]}while(!",
				cs,
				")}"
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

var binrec1 = function(cond, then, before, after){
	var cond   = df.lambda(cond),
		then   = df.lambda(then),
		before = df.lambda(before),
		after  = df.lambda(after);
	return function(){
		if(cond.apply(this, arguments)){
			return then.apply(this, arguments);
		}
		var args = before.apply(this, arguments);
		var ret1 = arguments.callee.apply(this, args[0]);
		var ret2 = arguments.callee.apply(this, args[1]);
		return after.call(this, ret1, ret2, arguments);
	};
};

2) The original iterative version (before minification and inlining):

var binrec2 = function(cond, then, before, after){
	var cond   = df.lambda(cond),
		then   = df.lambda(then),
		before = df.lambda(before),
		after  = df.lambda(after);
	return function(){
		var top1, top2, ret, args = arguments;
		// first part: start the pump
		while(!cond.apply(this, args)){
			ret = before.apply(this, args);
			top1 = {prev: top1, args: ret[1]};
			top2 = {prev: top2, args: args};
			args = ret[0];
		}
		for(;;){
			// second part: mop up
			do{
				ret = then.apply(this, args);
				if(!top2){
					return ret;
				}
				while("ret" in top2){
					ret = after.call(this, top2.ret, ret, top2.args);
					if(!(top2 = top2.prev)){
						return ret;
					}
				}
				top2.ret = ret;
				args = top1.args;
				top1 = top1.prev;
			}while(cond.apply(this, args));
			// first part (encore)
			do{
				ret = before.apply(this, args);
				top1 = {prev: top1, args: ret[1]};
				top2 = {prev: top2, args: args};
				args = ret[0];
			}while(!cond.apply(this, args));
		}
	};
};

*/