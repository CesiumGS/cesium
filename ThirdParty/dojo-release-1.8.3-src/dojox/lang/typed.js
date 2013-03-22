(function(){
	var jsonSchema, inDojo = typeof dojo != "undefined";
	if(inDojo){
		dojo.provide("dojox.lang.typed");
		dojo.require("dojox.json.schema");
		jsonSchema = dojox.json.schema;
	}else{
		if(typeof JSONSchema == "undefined"){
			throw new Error("Dojo or JSON Schema library must be present");
		}
		jsonSchema = JSONSchema;
	}
	function validatingFunction(func, getMethodDef){
		var validatingFunc = function(){
			var methodDef = getMethodDef();
			if(methodDef && methodDef.parameters){
				var params = methodDef.parameters;
				for(var j = 0; j < params.length; j++){
					arguments[j] = validate(arguments[j], params[j], j.toString());
				}
				if(methodDef.additionalParameters){
					for(;j < arguments.length; j++){
						arguments[j] = validate(arguments[j], methodDef.additionalParameters, j.toString());
					}
				}
			}
			var returns = func.apply(this, arguments);
			if(methodDef.returns){
				validate(returns, methodDef.returns);
			}
			return returns;
		};
		validatingFunc.__typedFunction__ = true;
		for(var i in func){
			validatingFunc[i] = func[i];
		}
		return validatingFunc;
	}
	function identityFunc(obj){
		return function(){
			return obj;
		}
	}
	function validate(instance, schema, property){
		// summary:
		//		This checks to ensure that the result is valid and will throw an appropriate error message if it is not
		// result:
		//		the result returned from checkPropertyChange or validate
		if(typeof instance == "function" && schema && !instance.__typedFunction__){
			instance = validatingFunction(instance, identityFunc(schema));
		}
		var result = jsonSchema._validate(instance, schema, property);
		if(!result.valid){
			var errorMessage = ""
			var errors = result.errors;
			for(var i = 0; i < errors.length; i++){
				errorMessage += errors[i].property + ' ' + errors[i].message + '\n';
			}
			throw new TypeError(errorMessage);
		}
		return instance;
	}
	var hasGetters = jsonSchema.__defineGetter__;
	var typedFunction = function(Class){
		// summary:
		//		Adds type checking to a class, returning a new class with typing enabled
		if(Class.__typedClass__){
			// type checking has already been added
			return Class;
		}
		var Wrapper = function(){
			var i, value, properties = Wrapper.properties;
			var methods = Wrapper.methods;
			Class.apply(this,arguments);
			this.__props__ = {};
			for(i in methods){
				value = this[i];
				if(value){
					if(!value.__typedFunction__){
						// add typing checking to the method, going up the proto chain to find the right one
						var proto = this;
						while(!proto.hasOwnProperty(i) && proto.__proto__){
							proto = proto.__proto__;
						}
						(function(i){
							proto[i] = validatingFunction(value, function(){
								return methods[i];
							});
						})(i);
					}
				}else{
					(function(i){
						this[i] = function(){
							throw new TypeError("The method " + i + " is defined but not implemented");
						};
					})(i);
				}
			}
			if(hasGetters){
				var self = this;
				for(i in properties){
					// add type checking to each property
					value = this[i];
					if(this.hasOwnProperty(i)){
						this.__props__[i] = value;
					}
					(function(i){
						delete self[i];
						self.__defineGetter__(i, function(){
							return i in this.__props__ ? this.__props__[i] : this.__proto__[i];
						});
						self.__defineSetter__(i, function(value){
							validate(value, properties[i], i);
							return this.__props__[i] = value;
						});
					})(i);
				}
			}
			validate(this, Wrapper);
		};
		Wrapper.prototype = Class.prototype;
		for(var i in Class){
			Wrapper[i] = Class[i];
		}
		if(Class.prototype.declaredClass && inDojo){
			dojo.setObject(Class.prototype.declaredClass, Wrapper);
		}
		Wrapper.__typedClass__ = true;
		return Wrapper;
	};
	if(inDojo){
		dojox.lang.typed = typedFunction;
		if(dojo.config.typeCheckAllClasses){
			//	This will add type checking to all classes that will be declared via dojo.declare
			//	(only ones to be declared in the future)

			// hook into all declared classes
			var defaultDeclare = dojo.declare;
			dojo.declare = function(name){
				var clazz = defaultDeclare.apply(this, arguments);
				clazz = typedFunction(clazz);
				return clazz;
			};
			dojo.mixin(dojo.declare, defaultDeclare);
		}
	}else{
		typed = typedFunction;
	}
})();
