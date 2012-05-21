dojo.provide("dojox.lang.oo.mixin");

dojo.experimental("dojox.lang.oo.mixin");

dojo.require("dojox.lang.oo.Filter");
dojo.require("dojox.lang.oo.Decorator");

(function(){
	var oo = dojox.lang.oo, Filter = oo.Filter, Decorator = oo.Decorator, empty = {},
		defaultFilter = function(name){ return name; },
		defaultDecorator = function(name, newValue, oldValue){ return newValue; },
		defaultMixer = function(target, name, newValue, oldValue){ target[name] = newValue; },
		defaults = {},	// for the internal use in the mixin()
		extraNames = dojo._extraNames, extraLen = extraNames.length,

		applyDecorator = oo.applyDecorator = function(decorator, name, newValue, oldValue){
			//	summary:
			//		applies a decorator unraveling all embedded decorators
			//	decorator: Function:
			//		top-level decorator to apply
			//	name: String:
			//		name of the property
			//	newValue: Object:
			//		new value of the property
			//	oldValue: Object:
			//		old value of the property
			//	returns: Object:
			//		returns the final value of the property
			if(newValue instanceof Decorator){
				var d = newValue.decorator;
				newValue = applyDecorator(decorator, name, newValue.value, oldValue);
				return d(name, newValue, oldValue);
			}
			return decorator(name, newValue, oldValue);
		};

	/*=====
	dojox.lang.oo.__MixinDefaults = function(){
		//	summary:
		//		a dict of default parameters for dojox.lang.oo._mixin
		//	decorator: Function:
		//		a decorator function to be used in absence of other decorators
		//	filter: Function:
		//		a filter function to be used in absence of other filters
		//	mixer: Function:
		//		a mixer function to be used to mix in new properties
		this.decorator = decorator;
		this.filter = filter;
		this.mixer = mixer;
	};
	=====*/

	oo.__mixin = function(target, source, decorator, filter, mixer){
		//	summary:
		//		mixes in two objects processing decorators and filters
		//	target: Object:
		//		target to receive new/updated properties
		//	source: Object:
		//		source of properties
		//	defaults: dojox.lang.oo.__MixinDefaults?:
		//		default functions for various aspects of mixing
		//	returns: Object:
		//		target

		var name, targetName, prop, newValue, oldValue, i;

		// start mixing in properties
		for(name in source){
			prop = source[name];
			if(!(name in empty) || empty[name] !== prop){
				targetName = filter(name, target, source, prop);
				if(targetName && (!(targetName in target) || !(targetName in empty) || empty[targetName] !== prop)){
					// name is accepted
					oldValue = target[targetName];
					newValue = applyDecorator(decorator, targetName, prop, oldValue);
					if(oldValue !== newValue){
						mixer(target, targetName, newValue, oldValue);
					}
				}
			}
		}
		if(extraLen){
			for(i = 0; i < extraLen; ++i){
				name = extraNames[i];
				// repeating the body above
				prop = source[name];
				if(!(name in empty) || empty[name] !== prop){
					targetName = filter(name, target, source, prop);
					if(targetName && (!(targetName in target) || !(targetName in empty) || empty[targetName] !== prop)){
						// name is accepted
						oldValue = target[targetName];
						newValue = applyDecorator(decorator, targetName, prop, oldValue);
						if(oldValue !== newValue){
							mixer(target, targetName, newValue, oldValue);
						}
					}
				}
			}
		}

		return target;	// Object
	};

	oo.mixin = function(target, source){
		// summary:
		//		mixes in two or more objects processing decorators and filters
		//		using defaults as a fallback
		// target: Object:
		//		target to receive new/updated properties
		// source: Object...:
		//		source of properties, more than one source is allowed
		// returns: Object:
		//		target

		var decorator, filter, i = 1, l = arguments.length;
		for(; i < l; ++i){
			source = arguments[i];
			if(source instanceof Filter){
				filter = source.filter;
				source = source.bag;
			}else{
				filter = defaultFilter;
			}
			if(source instanceof Decorator){
				decorator = source.decorator;
				source = source.value;
			}else{
				decorator = defaultDecorator;
			}
			oo.__mixin(target, source, decorator, filter, defaultMixer);
		}
		return target;	// Object
	};
})();
