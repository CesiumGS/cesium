dojo.provide("dojox.lang.functional.curry");

dojo.require("dojox.lang.functional.lambda");

// This module adds high-level functions and related constructs:
//	- currying and partial functions
//	- argument pre-processing: mixer and flip

// Acknowledgements:
//	- partial() is based on work by Oliver Steele
//		(http://osteele.com/sources/javascript/functional/functional.js)
//		which was published under MIT License

// Defined methods:
//	- take any valid lambda argument as the functional argument

(function(){
	var df = dojox.lang.functional, ap = Array.prototype;

	var currying = function(/*Object*/ info){
		return function(){	// Function
			var args = info.args.concat(ap.slice.call(arguments, 0));
			if(arguments.length + info.args.length < info.arity){
				return currying({func: info.func, arity: info.arity, args: args});
			}
			return info.func.apply(this, args);
		};
	};

	dojo.mixin(df, {
		// currying and partial functions
		curry: function(/*Function|String|Array*/ f, /*Number?*/ arity){
			// summary:
			//		curries a function until the arity is satisfied, at
			//		which point it returns the calculated value.
			f = df.lambda(f);
			arity = typeof arity == "number" ? arity : f.length;
			return currying({func: f, arity: arity, args: []});	// Function
		},
		arg: {},	// marker for missing arguments
		partial: function(/*Function|String|Array*/ f){
			// summary:
			//		creates a function where some arguments are bound, and
			//		some arguments (marked as dojox.lang.functional.arg) are will be
			//		accepted by the final function in the order they are encountered.
			// description:
			//		This method is used to produce partially bound
			//		functions. If you want to change the order of arguments, use
			//		dojox.lang.functional.mixer() or dojox.lang.functional.flip().
			var a = arguments, l = a.length, args = new Array(l - 1), p = [], i = 1, t;
			f = df.lambda(f);
			for(; i < l; ++i){
				t = a[i];
				args[i - 1] = t;
				if(t === df.arg){
					p.push(i - 1);
				}
			}
			return function(){	// Function
				var t = ap.slice.call(args, 0), // clone the array
					i = 0, l = p.length;
				for(; i < l; ++i){
					t[p[i]] = arguments[i];
				}
				return f.apply(this, t);
			};
		},
		// argument pre-processing
		mixer: function(/*Function|String|Array*/ f, /*Array*/ mix){
			// summary:
			//		changes the order of arguments using an array of
			//		numbers mix --- i-th argument comes from mix[i]-th place
			//		of supplied arguments.
			f = df.lambda(f);
			return function(){	// Function
				var t = new Array(mix.length), i = 0, l = mix.length;
				for(; i < l; ++i){
					t[i] = arguments[mix[i]];
				}
				return f.apply(this, t);
			};
		},
		flip: function(/*Function|String|Array*/ f){
			// summary:
			//		changes the order of arguments by reversing their
			//		order.
			f = df.lambda(f);
			return function(){	// Function
				// reverse arguments
				var a = arguments, l = a.length - 1, t = new Array(l + 1), i = 0;
				for(; i <= l; ++i){
					t[l - i] = a[i];
				}
				return f.apply(this, t);
			};
		}
	});
})();
