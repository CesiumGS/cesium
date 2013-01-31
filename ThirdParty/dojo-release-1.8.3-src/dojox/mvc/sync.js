define([
	"dojo/_base/lang",
	"dojo/_base/config",
	"dojo/_base/array",
	"dojo/has"
], function(lang, config, array, has){
	var mvc = lang.getObject("dojox.mvc", true);
	/*=====
	mvc = {};
	=====*/
	
	/*=====
	dojox.mvc.sync.converter = {
		// summary:
		//		Class/object containing the converter functions used when the data goes between data binding source (e.g. data model or controller) to data binding origin (e.g. widget).

		format: function(value, constraints){
			// summary:
			//		The converter function used when the data comes from data binding source (e.g. data model or controller) to data binding origin (e.g. widget).
			// value: Anything
			//		The data.
			// constraints: Object
			//		The options for data conversion, which is: mixin({}, dataBindingTarget.constraints, dataBindingOrigin.constraints).
		},

		parse: function(value, constraints){
			// summary:
			//		The converter function used when the data comes from data binding origin (e.g. widget) to data binding source (e.g. data model or controller).
			// value: Anything
			//		The data.
			// constraints: Object
			//		The options for data conversion, which is: mixin({}, dataBindingTarget.constraints, dataBindingOrigin.constraints).
		}
	};

	dojox.mvc.sync.options = {
		// summary:
		//		Data binding options.

		// bindDirection: Number
		//		The data binding bindDirection, choose from: dojox.mvc.Bind.from, dojox.mvc.Bind.to or dojox.mvc.Bind.both.
		bindDirection: dojox/mvc.both,

		// converter: dojox/mvc/sync.converter
		//		Class/object containing the converter functions used when the data goes between data binding source (e.g. data model or controller) to data binding origin (e.g. widget).
		converter: null
	};
	=====*/

	has.add("mvc-bindings-log-api", (config["mvc"] || {}).debugBindings);

	var sync;

	if(has("mvc-bindings-log-api")){
		function getLogContent(/*dojo/Stateful*/ source, /*String*/ sourceProp, /*dojo/Stateful*/ target, /*String*/ targetProp){
			return [
				[target._setIdAttr || !target.declaredClass ? target : target.declaredClass, targetProp].join(":"),
				[source._setIdAttr || !source.declaredClass ? source : source.declaredClass, sourceProp].join(":")
			];
		}
	}

	function equals(/*Anything*/ dst, /*Anything*/ src){
		// summary:
		//		Returns if the given two values are equal.

		return dst === src
		 || typeof dst == "number" && isNaN(dst) && typeof src == "number" && isNaN(src)
		 || lang.isFunction((dst || {}).getTime) && lang.isFunction((src || {}).getTime) && dst.getTime() == src.getTime()
		 || (lang.isFunction((dst || {}).equals) ? dst.equals(src) : lang.isFunction((src || {}).equals) ? src.equals(dst) : false);
	}

	function copy(/*Function*/ convertFunc, /*Object?*/ constraints, /*dojo/Stateful*/ source, /*String*/ sourceProp, /*dojo/Stateful*/ target, /*String*/ targetProp, /*Anything*/ old, /*Anything*/ current, /*Object?*/ excludes){
		// summary:
		//		Watch for change in property in dojo/Stateful object.
		// description:
		//		Called when targetProp property in target is changed. (This is mainly used as a callback function of dojo/Stateful.watch())
		//		When older value and newer value are different, copies the newer value to sourceProp property in source.
		// convertFunc: Function
		//		The data converter function.
		// constraints: Object?
		//		The data converter options.
		// source: dojo/Stateful
		//		The dojo/Stateful of copy source.
		// sourceProp: String
		//		The property of copy source, specified in data binding. May be wildcarded.
		// target: dojo/Stateful
		//		The dojo/Stateful of copy target.
		// targetProp: String
		//		The property of copy target, being changed. For wildcard-based data binding, this is used as the property to be copied.
		// old: Anything
		//		The older property value.
		// current: Anything
		//		The newer property value.
		// excludes: Object?
		//		The list of properties that should be excluded from wildcarded data binding.

		// Bail if there is no change in value,
		// or property name is wildcarded and the property to be copied is not in source property list (and source property list is defined),
		// or property name is wildcarded and the property to be copied is in explicit "excludes" list
		if(sync.equals(current, old)
		 || sourceProp == "*" && array.indexOf(source.get("properties") || [targetProp], targetProp) < 0
		 || sourceProp == "*" && targetProp in (excludes || {})){ return; }

		var prop = sourceProp == "*" ? targetProp : sourceProp;
		if(has("mvc-bindings-log-api")){
			var logContent = getLogContent(source, prop, target, targetProp);
		}

		try{
			current = convertFunc ? convertFunc(current, constraints) : current;
		}catch(e){
			if(has("mvc-bindings-log-api")){
				console.log("Copy from" + logContent.join(" to ") + " was not done as an error is thrown in the converter.");
			}
			return;
		}

		if(has("mvc-bindings-log-api")){
			console.log(logContent.reverse().join(" is being copied from: ") + " (Value: " + current + " from " + old + ")");
		}

		// Copy the new value to source
		lang.isFunction(source.set) ? source.set(prop, current) : (source[prop] = current);
	}

	var directions = {
		// from: Number
		//		Data binding goes from the source to the target
		from: 1,

		// to: Number
		//		Data binding goes from the target to the source
		to: 2,

		// both: Number
		//		Data binding goes in both directions (dojox/mvc/Bind.from | dojox/mvc/Bind.to)
		both: 3
	}, undef;

	sync = function(/*dojo/Stateful*/ source, /*String*/ sourceProp, /*dojo/Stateful*/ target, /*String*/ targetProp, /*dojox/mvc/sync.options*/ options){
		// summary:
		//		Synchronize two dojo/Stateful properties.
		// description:
		//		Synchronize two dojo/Stateful properties.
		// source: dojo/Stateful
		//		Source dojo/Stateful to be synchronized.
		// sourceProp: String
		//		The property name in source to be synchronized.
		// target: dojo/Stateful
		//		Target dojo/Stateful to be synchronized.
		// targetProp: String
		//		The property name in target to be synchronized.
		// options: dojox/mvc/sync.options
		//		Data binding options.
		// returns:
		//		The handle of data binding synchronization.

		var converter = (options || {}).converter, converterInstance, formatFunc, parseFunc;
		if(converter){
			converterInstance = {source: source, target: target};
			formatFunc = converter.format && lang.hitch(converterInstance, converter.format);
			parseFunc = converter.parse && lang.hitch(converterInstance, converter.parse);
		}

		var _watchHandles = [],
		 excludes = [],
		 list,
		 constraints = lang.mixin({}, source.constraints, target.constraints),
		 bindDirection = (options || {}).bindDirection || mvc.both;

		if(has("mvc-bindings-log-api")){
			var logContent = getLogContent(source, sourceProp, target, targetProp);
		}

		if(targetProp == "*"){
			if(sourceProp != "*"){ throw new Error("Unmatched wildcard is specified between source and target."); }
			list = target.get("properties");
			if(!list){
				list = [];
				for(var s in target){ if(target.hasOwnProperty(s) && s != "_watchCallbacks"){ list.push(s); } }
			}
			excludes = target.get("excludes");
		}else{
			list = [sourceProp];
		}

		if(bindDirection & mvc.from){
			// Start synchronization from source to target (e.g. from model to widget). For wildcard mode (sourceProp == targetProp == "*"), the 1st argument of watch() is omitted
			if(lang.isFunction(source.set) && lang.isFunction(source.watch)){
				_watchHandles.push(source.watch.apply(source, ((sourceProp != "*") ? [sourceProp] : []).concat([function(name, old, current){
					copy(formatFunc, constraints, target, targetProp, source, name, old, current, excludes);
				}])));
			}else if(has("mvc-bindings-log-api")){
				console.log(logContent.reverse().join(" is not a stateful property. Its change is not reflected to ") + ".");
			}

			// Initial copy from source to target (e.g. from model to widget)
			array.forEach(list, function(prop){
				// In "all properties synchronization" case, copy is not done for properties in "exclude" list
				if(targetProp != "*" || !(prop in (excludes || {}))){
					var value = lang.isFunction(source.get) ? source.get(prop) : source[prop];
					copy(formatFunc, constraints, target, targetProp == "*" ? prop : targetProp, source, prop, undef, value);
				}
			});
		}

		if(bindDirection & mvc.to){
			if(!(bindDirection & mvc.from)){
				// Initial copy from source to target (e.g. from model to widget)
				array.forEach(list, function(prop){
					// In "all properties synchronization" case, copy is not done for properties in "exclude" list
					if(targetProp != "*" || !(prop in (excludes || {}))){
						// Initial copy from target to source (e.g. from widget to model), only done for one-way binding from widget to model
						var value = lang.isFunction(target.get) ? target.get(targetProp) : target[targetProp];
						copy(parseFunc, constraints, source, prop, target, targetProp == "*" ? prop : targetProp, undef, value);
					}
				});
			}

			// Start synchronization from target to source (e.g. from widget to model). For wildcard mode (sourceProp == targetProp == "*"), the 1st argument of watch() is omitted
			if(lang.isFunction(target.set) && lang.isFunction(target.watch)){
				_watchHandles.push(target.watch.apply(target, ((targetProp != "*") ? [targetProp] : []).concat([function(name, old, current){
					copy(parseFunc, constraints, source, sourceProp, target, name, old, current, excludes);
				}])));
			}else if(has("mvc-bindings-log-api")){
				console.log(logContent.join(" is not a stateful property. Its change is not reflected to ") + ".");
			}
		}

		if(has("mvc-bindings-log-api")){
			console.log(logContent.join(" is bound to: "));
		}

		var handle = {};
		handle.unwatch = handle.remove = function(){
			for(var h = null; h = _watchHandles.pop();){
				h.unwatch();
				if(has("mvc-bindings-log-api")){
					console.log(logContent.join(" is unbound from: "));
				}
			}
		};
		return handle; // dojo/handle
	};

	lang.mixin(mvc, directions);

	// lang.setObject() thing is for back-compat, remove it in 2.0
	return lang.setObject("dojox.mvc.sync", lang.mixin(sync, {equals: equals}, directions));
});
