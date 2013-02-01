dojo.provide("dojox.help._base");
dojo.require("dojox.rpc.Service");
dojo.require("dojo.io.script");

dojo.experimental("dojox.help");
console.warn("Script causes side effects (on numbers, strings, and booleans). Call dojox.help.noConflict() if you plan on executing code.");

dojox.help = {
	// summary:
	//		Adds the help function to all variables.
	locate: function(/*String*/ searchFor, /*String|Object|String[]|Object[]*/ searchIn, /*Number*/ maxResults){
		// summary:
		//		Search for dojo functionality that has something to do with the given string.
		// description:
		//		Search for locally available data; variable names and any cached
		//		documentation results for matches containing our search parameter
		// searchFor:
		//		The string to search for.
		// searchIn:
		//		The namespaces to search in. Defaults to dojox.help._namespaces
		// maxResults:
		//		The maximum number of results.
		maxResults = maxResults || 20;
		var namespaces = [];
		var roots = {};
		var root;
		if(searchIn){
			if(!dojo.isArray(searchIn)){
				searchIn = [searchIn];
			}
			for(var i = 0, namespace; namespace = searchIn[i]; i++){
				root = namespace;
				if(dojo.isString(namespace)){
					namespace = dojo.getObject(namespace);
					if(!namespace){
						continue;
					}
				}else if(dojo.isObject(namespace)){
					root = namespace.__name__;
				}else{
					continue;
				}
				// Add to a list of namespace objects (in object form)
				namespaces.push(namespace);
				if(root){
					root = root.split(".")[0];
					if(!roots[root] && dojo.indexOf(dojox.help._namespaces, root) == -1){
						// Refresh anything that's not part of our global namespace list
						dojox.help.refresh(root);
					}
					roots[root] = true;
				}
			}
		}
		if(!namespaces.length){
			namespaces.push({ __name__: "window" });
			dojo.forEach(dojox.help._namespaces, function(item){ roots[item] = true; });
		}

		var searchForLower = searchFor.toLowerCase();
		var found = [];
		out:
		for(var i = 0, namespace; namespace = namespaces[i]; i++){
			var name = namespace.__name__ || "";
			var shorter = dojo.some(namespaces, function(item){
				// Return true if we find a namespace below
				// the current namespace
				item = item.__name__ || "";
				return (name.indexOf(item + ".") == 0);
			});
			if(name && !shorter){
				root = name.split(".")[0];
				var names = [];
				if(name == "window"){
					for(root in dojox.help._names){
						if(dojo.isArray(dojox.help._names[root])){
							names = names.concat(dojox.help._names[root]);
						}
					}
				}else{
					names = dojox.help._names[root];
				}
				for(var j = 0, variable; variable = names[j]; j++){
					if((name == "window" || variable.indexOf(name + ".") == 0) && variable.toLowerCase().indexOf(searchForLower) != -1){
						if(variable.slice(-10) == ".prototype"){ continue; }
						var obj = dojo.getObject(variable);
						if(obj){
							found.push([variable, obj]);
							if(found.length == maxResults){
								break out;
							}
						}
					}
				}
			}
		}

		dojox.help._displayLocated(found);
		if(!dojo.isMoz){
			return "";
		}
	},
	refresh: function(/*String?*/ namespace, /*Boolean?*/ recursive){
		// summary:
		//		Useful if you reset some values, and want to restore their
		//		help function
		// namespace:
		//		The string-representation of a namespace.
		// recursive:
		//		Whether to recurse through the namespace.
		if(arguments.length < 2){
			recursive = true;
		}
		dojox.help._recurse(namespace, recursive);
	},
	noConflict: function(/*Object?*/ item){
		// summary:
		//		Use this function when you want to resolve the problems
		//		created by including a dojox.help package.
		// item:
		//		If you pass an item, only that item will be cleaned
		if(arguments.length){
			return dojox.help._noConflict(item);
		}else{
			while(dojox.help._overrides.length){
				var override = dojox.help._overrides.pop();
				var parent = override[0];
				var key = override[1];
				var child = parent[key];
				parent[key] = dojox.help._noConflict(child);
			}
		}
	},
	init: function(/*String[]*/ namespaces, /*Boolen?*/ noConflict){
		// summary:
		//		Should be called by one of the implementations. Runs startup code
		// namespaces:
		//		Any namespaces to add to the default (dojox.help._namespaces)
		// noConflict:
		//		Whether to start in noConflict mode
		if(namespaces){
			dojox.help._namespaces.concat(namespaces);
		}
		dojo.addOnLoad(function(){
			dojo.require = (function(require){
				return function(){
					dojox.help.noConflict();
					require.apply(dojo, arguments);
					if(dojox.help._timer){
						clearTimeout(dojox.help._timer);
					}
					dojox.help._timer = setTimeout(function(){
						dojo.addOnLoad(function(){
							dojox.help.refresh();
							dojox.help._timer = false;
						});
					}, 500);
				}
			})(dojo.require);

			dojox.help._recurse();
		});
	},
	_noConflict: function(item){
		if(item instanceof String){
			return item.toString();
		}else if(item instanceof Number){
			return +item;
		}else if(item instanceof Boolean){
			return (item == true);
		}else if(dojo.isObject(item)){
			delete item.__name__;
			delete item.help;
		}
		return item;
	},
	_namespaces: ["dojo", "dojox", "dijit", "djConfig"],
	_rpc: new dojox.rpc.Service(dojo.moduleUrl("dojox.rpc.SMDLibrary", "dojo-api.smd")),
	_attributes: ["summary", "type", "returns", "parameters"],
	_clean: function(self){
		var obj = {};
		for(var i = 0, attribute; attribute = dojox.help._attributes[i]; i++){
			var value = self["__" + attribute + "__"];
			if(value){
				obj[attribute] = value;
			}
		}
		return obj;
	},
	_displayLocated: function(located){
		// summary:
		//		Stub function to be overridden in one of the dojox.help packages
		throw new Error("_displayLocated should be overridden in one of the dojox.help packages");
	},
	_displayHelp: function(loading, obj){
		// summary:
		//		Stub function to be overridden in one of the dojox.help packages
		throw new Error("_displayHelp should be overridden in one of the dojox.help packages");
	},
	_addVersion: function(obj){
		if(obj.name){
			obj.version = [dojo.version.major, dojo.version.minor, dojo.version.patch].join(".");
			var parts = obj.name.split(".");
			if(parts[0] == "dojo" || parts[0] == "dijit" || parts[0] == "dojox"){
				obj.project = parts[0];
			}
		}
		return obj;
	},
	_stripPrototype: function(original){
		var name = original.replace(/\.prototype(\.|$)/g, ".");
		var search = name;
		if(name.slice(-1) == "."){
			search = name = name.slice(0, -1);
		}else{
			name = original;
		}
		return [search, name];
	},
	_help: function(){
		var name = this.__name__;
		var search = dojox.help._stripPrototype(name)[0];
		var attributes = [];
		for(var i = 0, attribute; attribute = dojox.help._attributes[i]; i++){
			if(!this["__" + attribute + "__"]){
				attributes.push(attribute);
			}
		}

		dojox.help._displayHelp(true, { name: this.__name__ });

		if(!attributes.length || this.__searched__){
			dojox.help._displayHelp(false, dojox.help._clean(this));
		}else{
			this.__searched__ = true;
			dojox.help._rpc.get(dojox.help._addVersion({
				name: search,
				exact: true,
				attributes: attributes
			})).addCallback(this, function(data){
				if(this.toString === dojox.help._toString){
					this.toString(data);
				}
				if(data && data.length){
					data = data[0];
					for(var i = 0, attribute; attribute = dojox.help._attributes[i]; i++){
						if(data[attribute]){
							this["__" + attribute + "__"] = data[attribute];
						}
					}
					dojox.help._displayHelp(false, dojox.help._clean(this));
				}else{
					dojox.help._displayHelp(false, false);
				}
			});
		}
		if(!dojo.isMoz){
			return "";
		}
	},
	_parse: function(data){
		delete this.__searching__;
		if(data && data.length){
			var parameters = data[0].parameters;

			if(parameters){
				var signature = ["function ", this.__name__, "("];
				this.__parameters__ = parameters;
				for(var i = 0, parameter; parameter = parameters[i]; i++){
					if(i){
						signature.push(", ");
					}
					signature.push(parameter.name);
					if(parameter.types){
						var types = [];
						for(var j = 0, type; type = parameter.types[j]; j++){
							types.push(type.title);
						}
						if(types.length){
							signature.push(": ");
							signature.push(types.join("|"));
						}
					}
					if(parameter.repeating){
						signature.push("...");
					}
					if(parameter.optional){
						signature.push("?");
					}
				}
				signature.push(")");

				this.__source__ = this.__source__.replace(/function[^\(]*\([^\)]*\)/, signature.join(""));
			}

			if(this.__output__){
				delete this.__output__;
				console.log(this);
			}
		}else{
			dojox.help._displayHelp(false, false);
		}
	},
	_toStrings: {},
	_toString: function(data){
		if(!this.__source__){
			return this.__name__;
		}

		var first = (!this.__parameters__);
		this.__parameters__ = [];

		if(data){
			dojox.help._parse.call(this, data);
		}else if(first){
			this.__searching__ = true;
			dojox.help._toStrings[dojox.help._stripPrototype(this.__name__)[0]] = this;
			if(dojox.help._toStringTimer){
				clearTimeout(dojox.help._toStringTimer);
			}
			dojox.help._toStringTimer = setTimeout(function(){ dojox.help.__toString(); }, 50);
		}

		if(!first || !this.__searching__){
			return this.__source__;
		}

		var message = "function Loading info for " + this.__name__ + "... (watch console for result) {}";

		if(!dojo.isMoz){
			this.__output__ = true;
			return message;
		}

		return {
			toString: dojo.hitch(this, function(){
				// Detect if this was called by Firebug
				this.__output__ = true;
				return message;
			})
		};
	},
	__toString: function(){
		if(dojox.help._toStringTimer){
			clearTimeout(dojox.help._toStringTimer);
		}

		var names = [];
		dojox.help.noConflict(dojox.help._toStrings);
		for(var name in dojox.help._toStrings){
			names.push(name);
		}
		while(names.length){
			dojox.help._rpc.batch(dojox.help._addVersion({
				names: names.splice(-50, 50),
				exact: true,
				attributes: ["parameters"]
			})).addCallback(this, function(datas){
				for(var i = 0, data; data = datas[i]; i++){
					var fn = dojox.help._toStrings[data.name];
					if(fn){
						dojox.help._parse.call(fn, [data]);
						delete dojox.help._toStrings[data.name];
					}
				}
			});
		}
	},
	_overrides: [],
	_recursions: [],
	_names: {},
	_recurse: function(/*String?*/ namespace, /*Boolean?*/ recursive){
		if(arguments.length < 2){
			recursive = true;
		}

		var items = [];

		if(namespace && dojo.isString(namespace)){
			dojox.help.__recurse(dojo.getObject(namespace), namespace, namespace, items, recursive);
		}else{
			for(var i = 0, ns; ns = dojox.help._namespaces[i]; i++){
				if(window[ns]){
					dojox.help._recursions.push([window[ns], ns, ns]);
					window[ns].__name__ = ns;
					if(!window[ns].help){
						window[ns].help = dojox.help._help;
					}
				}
			}
		}

		while(dojox.help._recursions.length){
			var recursion = dojox.help._recursions.shift();
			dojox.help.__recurse(recursion[0], recursion[1], recursion[2], items, recursive);
		}

		for(var i = 0, item; item = items[i]; i++){
			delete item.__seen__;
		}
	},
	__recurse: function(namespace, root, name, items, recursive){
		for(var key in namespace){
			if(key.match(/([^\w_.$]|__[\w_.$]+__)/)){
				continue;
			}

			var item = namespace[key];
			if(typeof item == "undefined"
				|| item === document
				|| item === window
				|| item === dojox.help._toString
				|| item === dojox.help._help
				|| item === null
				|| (+dojo.isIE && item.tagName)
				|| item.__seen__
			) {
				continue;
			}

			var isFunction = dojo.isFunction(item);
			var isObject = dojo.isObject(item) && !dojo.isArray(item) && !item.nodeType;

			var itemName = (name) ? (name + "." + key) : key;

			if(itemName == "dojo._blockAsync"){
				continue;
			}

			if(!item.__name__){
				var parent = null;
				if(dojo.isString(item)){
					parent = String;
				}else if(typeof item == "number"){
					parent = Number;
				}else if(typeof item == "boolean"){
					parent = Boolean;
				}
				if(parent){
					item = namespace[key] = new parent(item);
				}
			}

			item.__seen__ = true;
			item.__name__ = itemName;
			(dojox.help._names[root] = dojox.help._names[root] || []).push(itemName);
			items.push(item);
			if(!isFunction){
				dojox.help._overrides.push([namespace, key]);
			}

			if((isFunction || isObject) && recursive){
				dojox.help._recursions.push([item, root, itemName]);
			}

			if(isFunction){
				if(!item.__source__){
					item.__source__ = item.toString().replace(/^function\b ?/, "function " + itemName);
				}
				if(item.toString === Function.prototype.toString){
					item.toString = dojox.help._toString;
				}
			}

			if(!item.help){
				item.help = dojox.help._help;
			}
		}
	}
};