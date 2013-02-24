define([
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/Stateful",
	"./StatefulArray"
], function(array, lang, Stateful, StatefulArray){
	var getStatefulOptions = {
		// summary:
		//		Options used for dojox/mvc/getStateful().

		getType: function(/*Anything*/ v){
			// summary:
			//		Returns the type of the given value.
			// v: Anything
			//		The value.

			return lang.isArray(v) ? "array" : v != null && {}.toString.call(v) == "[object Object]" ? "object" : "value";
		},

		getStatefulArray: function(/*Anything[]*/ a){
			// summary:
			//		Returns the stateful version of the given array.
			// a: Anything[]
			//		The array.

			return new StatefulArray(array.map(a, function(item){ return getStateful(item, this); }, this)); // dojox/mvc/StatefulArray
		},

		getStatefulObject: function(/*Object*/ o){
			// summary:
			//		Returns the stateful version of the given object.
			// o: Object
			//		The object.

			var stateful = new Stateful();
			for(var s in o){
				stateful[s] = getStateful(o[s], this);
			}
			return stateful; // dojo/Stateful
		},

		getStatefulValue: function(/*Anything*/ v){
			// summary:
			//		Just returns the given value.

			return v; // Anything
		}
	};

	var getStateful = function(/*Anything*/ value, /*dojox/mvc/getStatefulOptions*/ options){
		// summary:
		//		Create a dojo/Stateful object from a raw value.
		// description:
		//		Recursively iterates the raw value given, and convert them to stateful ones.
		// value: Anything
		//		The raw value.
		// options: dojox/mvc/getStatefulOptions
		//		The object that defines how model object should be created from plain object hierarchy.
		// returns: Anything
		//		 The converted value.

		return (options || getStateful)["getStateful" + (options || getStateful).getType(value).replace(/^[a-z]/, function(c){ return c.toUpperCase(); })](value); // Anything
	};

	// lang.setObject() thing is for back-compat, remove it in 2.0
	return lang.setObject("dojox.mvc.getStateful", lang.mixin(getStateful, getStatefulOptions));
});
