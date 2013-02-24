define([
	"dojo/_base/lang",
	"dojo/_base/array"
], function(lang, array){
	var mvc = lang.getObject("dojox.mvc", true);

	return lang.mixin(mvc, {
		bind: function(/*dojo/Stateful*/ source, /*String*/ sourceProp,
					/*dojo/Stateful*/ target, /*String*/ targetProp,
					/*Function?*/ func, /*Boolean?*/ bindOnlyIfUnequal){
			// summary:
			//		Bind the specified property of the target to the specified
			//		property of the source with the supplied transformation.
			// source:
			//		The source dojo/Stateful object for the bind.
			// sourceProp:
			//		The name of the source's property whose change triggers the bind.
			// target:
			//		The target dojo/Stateful object for the bind whose
			//		property will be updated with the result of the function.
			// targetProp:
			//		The name of the target's property to be updated with the
			//		result of the function.
			// func:
			//		The optional calculation to be performed to obtain the target
			//		property value.
			// bindOnlyIfUnequal:
			//		Whether the bind notification should happen only if the old and
			//		new values are unequal (optional, defaults to false).
			var convertedValue;
			return source.watch(sourceProp, function(prop, oldValue, newValue){
				convertedValue = lang.isFunction(func) ? func(newValue) : newValue;
				if(!bindOnlyIfUnequal || convertedValue != target.get(targetProp)){
					target.set(targetProp, convertedValue);
				}
			});
		},

		bindInputs: function(/*dojo/Stateful[]*/ sourceBindArray, /*Function*/ func){
			// summary:
			//		Bind the values at the sources specified in the first argument
			//		array such that a composing function in the second argument is
			//		called when any of the values changes.
			// sourceBindArray:
			//		The array of dojo/Stateful objects to watch values changes on.
			// func:
			//		The composing function that is called when any of the source
			//		values changes.
			// tags:
			//		protected
			var watchHandles = [];
			array.forEach(sourceBindArray, function(h){
				watchHandles.push(h.watch("value", func));
			});
			return watchHandles;
		}
	});
});
