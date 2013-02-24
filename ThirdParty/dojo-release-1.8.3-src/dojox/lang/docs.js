dojo.provide("dojox.lang.docs");

// Extracts information from the API docs to apply a schema representation to dojo classes.
// This can be utilized for runtime metadata retrieval and type checking
(function(){
	function error(error){
		console.log("Warning, the API docs must be available at ../util/docscripts/api.json "+
		"or ../util/docscripts/api/*.json "+
		"in order for dojox.lang.docs to supply schema information, but it could not be loaded: " + error);
	}

	var declaredClasses = {};
	var requiredModules = [];
	var _docs = dojox.lang.docs._loadedDocs = {};

	var schemifyClass = function(clazz, name){
		// initial implementation records classes until they are ready
		declaredClasses[name] = clazz;
	};
	var getType = function(typeDef){
		var type = typeDef.type || '';
		var typeObj, optional = false, array = false, dontModify;
		type = type.replace(/\?/, function(){
			optional = true;
			return '';
		});
		type = type.replace(/\[\]/, function(){
			array = true;
			return '';
		});
		if(type.match(/HTML/)){
			// HTML String and other "types" of strings are really just strings
			type = "string";
		}else if(type == 'String' || type == 'Number' ||
				type == 'Boolean' || type == 'Object' ||
				type == 'Array' || type == 'Integer' || type == "Function"){
			type = type.toLowerCase();
		}else if(type == "bool"){
			type = "boolean";
		}else if(type){
			typeObj = dojo.getObject(type) || {};
			dontModify = true;
		}else{
			typeObj = {};
		}
		typeObj = typeObj || {type:type};
		if(array){
			typeObj = {items:typeObj, type:"array"};
			dontModify = false;
		}
		if(!dontModify){
			if(optional){
				typeObj.optional = true;
			}
			if(/const/.test(typeDef.tags)){
				typeObj.readonly = true;
			}
		}
		return typeObj;
	};
	var actualSchemifyClass = function(clazz, name){
		var docForClass = _docs[name];
		if(docForClass){
			clazz.description = docForClass.description;
			clazz.properties = {};
			clazz.methods = {};

			if(docForClass.properties){
				var props = docForClass.properties;
				for(var i=0, l=props.length; i<l; i++){
					if(props[i].scope == "prototype"){
						var propDef = clazz.properties[props[i].name] = getType(props[i]);
						propDef.description = props[i].summary;
					}
				}
			}

			// translate the methods to JSON Schema
			if(docForClass.methods){
				var methods = docForClass.methods;
				for(i=0, l=methods.length; i<l; i++){
					name = methods[i].name;
					if(name && methods[i].scope == "prototype"){
						var methodDef = clazz.methods[name] = {};
						methodDef.description = methods[i].summary;
						var parameters = methods[i].parameters;
						if(parameters){
							methodDef.parameters = [];
							for(var j=0, k=parameters.length; j<k; j++){
								var param = parameters[j];
								var paramDef = methodDef.parameters[j] = getType(param);
								paramDef.name = param.name;
								paramDef.optional = "optional" == param.usage;
							}
						}
						var ret = methods[i]['return-types'];
						if(ret && ret[0]){
							var returns = getType(ret[0]);
							if(returns.type){
								methodDef.returns = returns;
							}
						}
					}
				}
			}

			var superclass = docForClass.superclass;
			if(superclass){
				clazz["extends"] = dojo.getObject(superclass);
			}
		}
	};
	var requireDocs = function(moduleName){
		requiredModules.push(moduleName);
	};

	// hook into all declared classes
	var defaultDeclare = dojo.declare;
	dojo.declare = function(name){
		var clazz = defaultDeclare.apply(this, arguments);
		schemifyClass(clazz, name);
		return clazz;
	};
	dojo.mixin(dojo.declare, defaultDeclare);
	var initialized;

	// hook into dojo.require
	var defaultRequire = dojo.require;
	dojo.require = function(moduleName){
		requireDocs(moduleName);
		var module = defaultRequire.apply(this, arguments);
		return module;
	};

	dojox.lang.docs.init = function(/*Boolean*/async){
		// summary:
		//		Loads the documentation and applies it to the previously defined classes
		//		and any future defined classes
		// async:
		//		 If true, the documentation will be loaded asynchronously
		function loadFullDocs(){
			dojo.require = defaultRequire;
			requiredModules = null;
			try{
				dojo.xhrGet({
					sync:!async,
					url: dojo.baseUrl + '../util/docscripts/api.json',
					handleAs: 'text'
				}).addCallbacks(function(obj){
					_docs = (new Function("return " + obj))();
					obj = null;
					schemifyClass = actualSchemifyClass;

					for(var i in declaredClasses){
						schemifyClass(declaredClasses[i], i);
					}
					declaredClasses = null;
				}, error);
			}catch(e){
				error(e);
			}
		}
		
		if(initialized){
			return null;
		}
		initialized = true;

		var getSplitDocs = function(moduleName, sync){
			return dojo.xhrGet({
				sync: sync||!async,
				url: dojo.baseUrl + '../util/docscripts/api/' + moduleName + '.json',
				handleAs: 'text'
			}).addCallback(function(obj){
				obj = (new Function("return " + obj))();
				for(var clazz in obj){
					if(!_docs[clazz]){
						_docs[clazz] = obj[clazz];
					}
				}
			});
		};
		try{
			var firstMod = requiredModules.shift();
			getSplitDocs(firstMod, true).addCallbacks(function(){
				requireDocs = function(moduleName){
					if(!_docs[moduleName]){
						try{
							getSplitDocs(moduleName);
						}catch(e){
							_docs[moduleName] = {};
						}
					}
				};
				//console.log(requiredModules);
				dojo.forEach(requiredModules, function(mod){
					requireDocs(mod);
				});
				requiredModules = null;

				schemifyClass = actualSchemifyClass;

				for(i in declaredClasses){
					schemifyClass(declaredClasses[i], i);
				}
				declaredClasses = null;
			},loadFullDocs);
		}catch(e){
			loadFullDocs();
		}
		return null;
	}
})();
