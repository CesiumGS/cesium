define([
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/Stateful",
	"./StatefulArray"
], function(array, lang, Stateful, StatefulArray){
	var equalsOptions = {
		// summary:
		//		Options used for dojox/mvc/equals().

		getType: function(/*Anything*/ v){
			// summary:
			//		Returns the type of the given value.
			// v: Anything
			//		The value.

			return lang.isArray(v) ? "array" : lang.isFunction((v || {}).getTime) ? "date" : v != null && ({}.toString.call(v) == "[object Object]" || lang.isFunction((v || {}).set) && lang.isFunction((v || {}).watch)) ? "object" : "value";
		},

		equalsArray: function(/*Anything[]*/ dst, /*Anything[]*/ src){
			// summary:
			//		Returns if the given two stateful arrays are equal.
			// dst: Anything[]
			//		The array to compare with.
			// src: Anything[]
			//		The array to compare with.

			for(var i = 0, l = Math.max(dst.length, src.length); i < l; i++){
				if(!equals(dst[i], src[i])){ return false; }
			}
			return true;
		},

		equalsDate: function(/*Date*/ dst, /*Date*/ src){
			return dst.getTime() == src.getTime();
		},

		equalsObject: function(/*Object*/ dst, /*Object*/ src){
			// summary:
			//		Returns if the given two stateful objects are equal.
			// dst: Object
			//		The object to compare with.
			// src: Object
			//		The object to compare with.

			var list = lang.mixin({}, dst, src);
			for(var s in list){
				if(!(s in Stateful.prototype) && s != "_watchCallbacks" && !equals(dst[s], src[s])){ return false; }
			}
			return true;
		},

		equalsValue: function(/*Anything*/ dst, /*Anything*/ src){
			// summary:
			//		Returns if the given two values are equal.

			return dst === src; // Boolean
		}
	};

	var equals = function(/*Anything*/ dst, /*Anything*/ src, /*dojox/mvc/equalsOptions*/ options){
		// summary:
		//		Compares two dojo/Stateful objects, by diving into the leaves.
		// description:
		//		Recursively iterates and compares stateful values.
		// dst: Anything
		//		The stateful value to compare with.
		// src: Anything
		//		The stateful value to compare with.
		// options: dojox/mvc/equalsOptions
		//		The object that defines how two stateful values are compared.
		// returns: Boolean
		//		True if dst equals to src, false otherwise.

		var opts = options || equals, types = [opts.getType(dst), opts.getType(src)];
		return types[0] != types[1] ? false : opts["equals" + types[0].replace(/^[a-z]/, function(c){ return c.toUpperCase(); })](dst, src); // Boolean
	};

	// lang.setObject() thing is for back-compat, remove it in 2.0
	return lang.setObject("dojox.mvc.equals", lang.mixin(equals, equalsOptions));
});
