define([], function(){
// TODO:
// allow a declare without a mixin

return {
	// summary:
	//		Inheritance utilities used in DojoX Drawing
	// description:
	//		Inheritance utilities used in DojoX Drawing.
	//		There were designed in a effort to make Drawing as
	//		fast as possible - especially in a case where thousands
	//		of objects are being loaded. Drawing declare performs
	//		about 3 times faster than declare and 2 times
	//		faster than Dojox declare. This is not to say Drawing
	//		declare is without limitations. It doesn't have the same
	//		syntactic sugar and extensibility of the other two. You
	//		can't inherit methods. It won't work with Dijit. But it
	//		is simple and effective.

	declare: function(){
		// summary:
		//		Creates a constructor Function from a
		//		Function, and collection of methods, and
		//		more Functions that are extended.
		// description:
		//		Similar in look and feel to declare as
		//		far as order and number of arguments, although
		//		constructed a little closer to prototypical
		//		inheritance. All arguments passed into the
		//		constructor are passed into all sub constructors.
		//
		//		Arguments are: Function, [Object|Function....]
		//		The first argument is always the base
		//		constructor. The last argument is always
		//		an object of methods (or empty object) to
		//		be mixed in (in the future would like to
		//		make that object optional). Remaining
		//		arguments are other constructors mixed in
		//		using extend() (See below).
		// example:
		//		|	MyFunction = dojox.drawing.util.oo.declare(
		//		|		MyOtherFunction,
		//		|		YetAnotherFunction,
		//		|		function(options){
		//		|			// This is my constructor. It will fire last.
		//		|			// The other constructors will fire before this.
		//		|		},
		//		|		{
		//		|			customType:"equation", // mixed in property
		//		|			doThing: function(){   // mixed in method
		//		|
		//		|			}
		//		|		}
		//		|	);
		//		|
		//		|	var f = new MyFunction();

		var f, o, ext=0, a = arguments;
				
		if(a.length<2){ console.error("drawing.util.oo.declare; not enough arguments")}
		if(a.length==2){
			f = a[0]; o = a[1];
		}else{
			a = Array.prototype.slice.call(arguments);
			o = a.pop();
			f = a.pop();
			ext = 1;
		}
		for(var n in o){
			f.prototype[n] = o[n];
		}
		if(ext){
			a.unshift(f);
			f = this.extend.apply(this, a);
		}
		return f; // Function
	},
	extend: function(){
		// summary:
		//		Extends constructors to inherit from other
		//		constructors .
		// description:
		//		Typically not used by itself - it's used as
		//		part of declare(). Could be used by itself
		//		however, to mix together two or more
		//		constructors.
		//
		//		Any number of arguments, all must be
		//		function constructors. The first is
		//		considered the base object and its
		//		constructor will fire first.
		// example:
		//		|	var A = function(){};
		//		|	var B = function(){};
		//		|	var C = function(){};
		//		|	var D = dojox.drawing.util.oo.extend(A, B, C);
		//		|	var e = new D();

		var a = arguments, sub = a[0];
		if(a.length<2){ console.error("drawing.util.oo.extend; not enough arguments")}
		var f = function (){
			for(var i=1;i<a.length;i++){
				a[i].prototype.constructor.apply(this, arguments);
			}
			// sub should fire last
			sub.prototype.constructor.apply(this, arguments);
			
		};
		for(var i=1;i<a.length;i++){
			for(var n in a[i].prototype){
				f.prototype[n] = a[i].prototype[n];
			}
		}
			
		for(n in sub.prototype){
			f.prototype[n] = sub.prototype[n];
		}
		return f; // Function
	}
};
});
