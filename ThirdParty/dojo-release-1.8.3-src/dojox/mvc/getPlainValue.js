define([
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/Stateful"
], function(array, lang, Stateful){
	var getPlainValueOptions = {
		// summary:
		//		Options used for dojox/mvc/getPlainValue().

		getType: function(/*Anything*/ v){
			// summary:
			//		Returns the type of the given value.
			// v: Anything
			//		The value.
			// returns:
			//		 The type of the given value.

			return lang.isArray(v) ? "array" : v != null && {}.toString.call(v) == "[object Object]" ? "object" : "value";
		},

		getPlainArray: function(/*Anything[]*/ a){
			// summary:
			//		Returns the stateful version of the given array.
			// a: Anything[]
			//		The array.
			// returns:
			//		 The converted array.

			return array.map(a, function(item){ return getPlainValue(item, this); }, this); // Anything[]
		},

		getPlainObject: function(/*Object*/ o){
			// summary:
			//		Returns the stateful version of the given object.
			// o: Object
			//		The object.

			var plain = {};
			for(var s in o){
				if(!(s in Stateful.prototype) && s != "_watchCallbacks"){
					plain[s] = getPlainValue(o[s], this);
				}
			}
			return plain; // Object
		},

		getPlainValue: function(/*Anything*/ v){
			// summary:
			//		Just returns the given value.

			return v; // Anything
		}
	};

	var getPlainValue = function(/*Anything*/ value, /*dojox/mvc/getPlainValueOptions*/ options){
		// summary:
		//		Create a raw value from a dojo/Stateful object.
		// description:
		//		Recursively iterates the stateful value given, and convert them to raw ones.
		// value: Anything
		//		The stateful value.
		// options: dojox/mvc/getPlainValueOptions
		//		The object that defines how plain value should be created from stateful value.
		// returns:
		//		 The converted value.

		return (options || getPlainValue)["getPlain" + (options || getPlainValue).getType(value).replace(/^[a-z]/, function(c){ return c.toUpperCase(); })](value); // Anything
	};

	// lang.setObject() thing is for back-compat, remove it in 2.0
	return lang.setObject("dojox.mvc.getPlainValue", lang.mixin(getPlainValue, getPlainValueOptions));
});
