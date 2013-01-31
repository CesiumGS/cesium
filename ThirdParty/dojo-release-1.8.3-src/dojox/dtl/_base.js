define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojox/string/tokenize",
	"dojo/_base/json",
	"dojo/dom",
	"dojo/_base/xhr",
	"dojox/string/Builder",
	"dojo/_base/Deferred"], 
	function(kernel, lang, Tokenize, json, dom, xhr, StringBuilder, deferred){

	kernel.experimental("dojox.dtl");
	var dd = lang.getObject("dojox.dtl", true);
	dd._base = {};

	dd.TOKEN_BLOCK = -1;
	dd.TOKEN_VAR = -2;
	dd.TOKEN_COMMENT = -3;
	dd.TOKEN_TEXT = 3;

	dd._Context = lang.extend(function(dict){
		// summary:
		//		Pass one of these when rendering a template to tell the template what values to use.
		if(dict){
			lang._mixin(this, dict);
			if(dict.get){
				// Preserve passed getter and restore prototype get
				this._getter = dict.get;
				delete this.get;
			}
		}
	},
	{
		push: function(){
			var last = this;
			var context = lang.delegate(this);
			context.pop = function(){ return last; }
			return context;
		},
		pop: function(){
			throw new Error("pop() called on empty Context");
		},
		get: function(key, otherwise){
			var n = this._normalize;

			if(this._getter){
				var got = this._getter(key);
				if(got !== undefined){
					return n(got);
				}
			}

			if(this[key] !== undefined){
				return n(this[key]);
			}

			return otherwise;
		},
		_normalize: function(value){
			if(value instanceof Date){
				value.year = value.getFullYear();
				value.month = value.getMonth() + 1;
				value.day = value.getDate();
				value.date = value.year + "-" + ("0" + value.month).slice(-2) + "-" + ("0" + value.day).slice(-2);
				value.hour = value.getHours();
				value.minute = value.getMinutes();
				value.second = value.getSeconds();
				value.microsecond = value.getMilliseconds();
			}
			return value;
		},
		update: function(dict){
			var context = this.push();
			if(dict){
				lang._mixin(this, dict);
			}
			return context;
		}
	});

	var smart_split_re = /("(?:[^"\\]*(?:\\.[^"\\]*)*)"|'(?:[^'\\]*(?:\\.[^'\\]*)*)'|[^\s]+)/g;
	var split_re = /\s+/g;
	var split = function(/*String|RegExp?*/ splitter, /*Integer?*/ limit){
		splitter = splitter || split_re;
		if(!(splitter instanceof RegExp)){
			splitter = new RegExp(splitter, "g");
		}
		if(!splitter.global){
			throw new Error("You must use a globally flagged RegExp with split " + splitter);
		}
		splitter.exec(""); // Reset the global

		var part, parts = [], lastIndex = 0, i = 0;
		while((part = splitter.exec(this))){
			parts.push(this.slice(lastIndex, splitter.lastIndex - part[0].length));
			lastIndex = splitter.lastIndex;
			if(limit && (++i > limit - 1)){
				break;
			}
		}
		parts.push(this.slice(lastIndex));
		return parts;
	};

	dd.Token = function(token_type, contents){
		// tags:
		//		private
		this.token_type = token_type;
		this.contents = new String(lang.trim(contents));
		this.contents.split = split;
		this.split = function(){
			return String.prototype.split.apply(this.contents, arguments);
		}
	};
	dd.Token.prototype.split_contents = function(/*Integer?*/ limit){
		var bit, bits = [], i = 0;
		limit = limit || 999;
		while(i++ < limit && (bit = smart_split_re.exec(this.contents))){
			bit = bit[0];
			if(bit.charAt(0) == '"' && bit.slice(-1) == '"'){
				bits.push('"' + bit.slice(1, -1).replace('\\"', '"').replace('\\\\', '\\') + '"');
			}else if(bit.charAt(0) == "'" && bit.slice(-1) == "'"){
				bits.push("'" + bit.slice(1, -1).replace("\\'", "'").replace('\\\\', '\\') + "'");
			}else{
				bits.push(bit);
			}
		}
		return bits;
	};

	var ddt = dd.text = {
		_get: function(module, name, errorless){
			// summary:
			//		Used to find both tags and filters
			var params = dd.register.get(module, name.toLowerCase(), errorless);
			if(!params){
				if(!errorless){
					throw new Error("No tag found for " + name);
				}
				return null;
			}

			var fn = params[1];
			var deps = params[2];

			var parts;
			if(fn.indexOf(":") != -1){
				parts = fn.split(":");
				fn = parts.pop();
			}

// FIXME: THIS DESIGN DOES NOT WORK WITH ASYNC LOADERS!
			var mod = deps;
			if (/\./.test(deps)) {
				deps = deps.replace(/\./g, "/");
			}
			require([deps], function(){});

			var parent = lang.getObject(mod);

			return parent[fn || name] || parent[name + "_"] || parent[fn + "_"];
		},
		getTag: function(name, errorless){
			return ddt._get("tag", name, errorless);
		},
		getFilter: function(name, errorless){
			return ddt._get("filter", name, errorless);
		},
		getTemplate: function(file){
			return new dd.Template(ddt.getTemplateString(file));
		},
		getTemplateString: function(file){
			return xhr._getText(file.toString()) || "";
		},
		_resolveLazy: function(location, sync, json){
			if(sync){
				if(json){
					return json.fromJson(xhr._getText(location)) || {};
				}else{
					return dd.text.getTemplateString(location);
				}
			}else{
				return xhr.get({
					handleAs: json ? "json" : "text",
					url: location
				});
			}
		},
		_resolveTemplateArg: function(arg, sync){
			if(ddt._isTemplate(arg)){
				if(!sync){
					var d = new deferred();
					d.callback(arg);
					return d;
				}
				return arg;
			}
			return ddt._resolveLazy(arg, sync);
		},
		_isTemplate: function(arg){
			return (arg === undefined) || (typeof arg == "string" && (arg.match(/^\s*[<{]/) || arg.indexOf(" ") != -1));
		},
		_resolveContextArg: function(arg, sync){
			if(arg.constructor == Object){
				if(!sync){
					var d = new deferred;
					d.callback(arg);
					return d;
				}
				return arg;
			}
			return ddt._resolveLazy(arg, sync, true);
		},
		_re: /(?:\{\{\s*(.+?)\s*\}\}|\{%\s*(load\s*)?(.+?)\s*%\})/g,
		tokenize: function(str){
			return Tokenize(str, ddt._re, ddt._parseDelims);
		},
		_parseDelims: function(varr, load, tag){
			if(varr){
				return [dd.TOKEN_VAR, varr];
			}else if(load){
				var parts = lang.trim(tag).split(/\s+/g);
				for(var i = 0, part; part = parts[i]; i++){
					if (/\./.test(part)){
						part = part.replace(/\./g,"/");
					}
					require([part]);
				}
			}else{
				return [dd.TOKEN_BLOCK, tag];
			}
		}
	};

	dd.Template = lang.extend(function(/*String|dojo._Url*/ template, /*Boolean*/ isString){
		// summary:
		//		The base class for text-based templates.
		// template: String|dojo/_base/url
		//		The string or location of the string to
		//		use as a template
		// isString: Boolean
		//		Indicates whether the template is a string or a url.
		var str = isString ? template : ddt._resolveTemplateArg(template, true) || "";
		var tokens = ddt.tokenize(str);
		var parser = new dd._Parser(tokens);
		this.nodelist = parser.parse();
	},
	{
		update: function(node, context){
			// summary:
			//		Updates this template according to the given context.
			// node: DOMNode|String|dojo/NodeList
			//		A node reference or set of nodes
			// context: dojo/base/url|String|Object
			//		The context object or location
			return ddt._resolveContextArg(context).addCallback(this, function(contextObject){
				var content = this.render(new dd._Context(contextObject));
				if(node.forEach){
					node.forEach(function(item){
						item.innerHTML = content;
					});
				}else{
					dom.byId(node).innerHTML = content;
				}
				return this;
			});
		},
		render: function(context, buffer){
			// summary:
			//		Renders this template.
			// context: Object
			//		The runtime context.
			// buffer: StringBuilder?
			//		A string buffer.
			buffer = buffer || this.getBuffer();
			context = context || new dd._Context({});
			return this.nodelist.render(context, buffer) + "";
		},
		getBuffer: function(){
			return new StringBuilder();
		}
	});

	var qfRe = /\{\{\s*(.+?)\s*\}\}/g;
	dd.quickFilter = function(str){
		if(!str){
			return new dd._NodeList();
		}

		if(str.indexOf("{%") == -1){
			return new dd._QuickNodeList(Tokenize(str, qfRe, function(token){
				return new dd._Filter(token);
			}));
		}
	};

	dd._QuickNodeList = lang.extend(function(contents){
		this.contents = contents;
	},
	{
		render: function(context, buffer){
			for(var i = 0, l = this.contents.length; i < l; i++){
				if(this.contents[i].resolve){
					buffer = buffer.concat(this.contents[i].resolve(context));
				}else{
					buffer = buffer.concat(this.contents[i]);
				}
			}
			return buffer;
		},
		dummyRender: function(context){ return this.render(context, dd.Template.prototype.getBuffer()).toString(); },
		clone: function(buffer){ return this; }
	});

	dd._Filter = lang.extend(function(token){
		// summary:
		//		Uses a string to find (and manipulate) a variable
		if(!token) throw new Error("Filter must be called with variable name");
		this.contents = token;

		var cache = this._cache[token];
		if(cache){
			this.key = cache[0];
			this.filters = cache[1];
		}else{
			this.filters = [];
			Tokenize(token, this._re, this._tokenize, this);
			this._cache[token] = [this.key, this.filters];
		}
	},
	{
		_cache: {},
		_re: /(?:^_\("([^\\"]*(?:\\.[^\\"])*)"\)|^"([^\\"]*(?:\\.[^\\"]*)*)"|^([a-zA-Z0-9_.]+)|\|(\w+)(?::(?:_\("([^\\"]*(?:\\.[^\\"])*)"\)|"([^\\"]*(?:\\.[^\\"]*)*)"|([a-zA-Z0-9_.]+)|'([^\\']*(?:\\.[^\\']*)*)'))?|^'([^\\']*(?:\\.[^\\']*)*)')/g,
		_values: {
			0: '"', // _("text")
			1: '"', // "text"
			2: "", // variable
			8: '"' // 'text'
		},
		_args: {
			4: '"', // :_("text")
			5: '"', // :"text"
			6: "", // :variable
			7: "'"// :'text'
		},
		_tokenize: function(){
			var pos, arg;

			for(var i = 0, has = []; i < arguments.length; i++){
				has[i] = (arguments[i] !== undefined && typeof arguments[i] == "string" && arguments[i]);
			}

			if(!this.key){
				for(pos in this._values){
					if(has[pos]){
						this.key = this._values[pos] + arguments[pos] + this._values[pos];
						break;
					}
				}
			}else{
				for(pos in this._args){
					if(has[pos]){
						var value = arguments[pos];
						if(this._args[pos] == "'"){
							value = value.replace(/\\'/g, "'");
						}else if(this._args[pos] == '"'){
							value = value.replace(/\\"/g, '"');
						}
						arg = [!this._args[pos], value];
						break;
					}
				}
				// Get a named filter
				var fn = ddt.getFilter(arguments[3]);
				if(!lang.isFunction(fn)) throw new Error(arguments[3] + " is not registered as a filter");
				this.filters.push([fn, arg]);
			}
		},
		getExpression: function(){
			return this.contents;
		},
		resolve: function(context){
			if(this.key === undefined){
				return "";
			}

			var str = this.resolvePath(this.key, context);

			for(var i = 0, filter; filter = this.filters[i]; i++){
				// Each filter has the function in [0], a boolean in [1][0] of whether it's a variable or a string
				// and [1][1] is either the variable name of the string content.
				if(filter[1]){
					if(filter[1][0]){
						str = filter[0](str, this.resolvePath(filter[1][1], context));
					}else{
						str = filter[0](str, filter[1][1]);
					}
				}else{
					str = filter[0](str);
				}
			}

			return str;
		},
		resolvePath: function(path, context){
			var current, parts;
			var first = path.charAt(0);
			var last = path.slice(-1);
			if(!isNaN(parseInt(first))){
				current = (path.indexOf(".") == -1) ? parseInt(path) : parseFloat(path);
			}else if(first == '"' && first == last){
				current = path.slice(1, -1);
			}else{
				if(path == "true"){ return true; }
				if(path == "false"){ return false; }
				if(path == "null" || path == "None"){ return null; }
				parts = path.split(".");
				current = context.get(parts[0]);

				if(lang.isFunction(current)){
					var self = context.getThis && context.getThis();
					if(current.alters_data){
						current = "";
					}else if(self){
						current = current.call(self);
					}else{
						current = "";
					}
				}

				for(var i = 1; i < parts.length; i++){
					var part = parts[i];
					if(current){
						var base = current;
						if(lang.isObject(current) && part == "items" && current[part] === undefined){
							var items = [];
							for(var key in current){
								items.push([key, current[key]]);
							}
							current = items;
							continue;
						}

						if(current.get && lang.isFunction(current.get) && current.get.safe){
							current = current.get(part);
						}else if(current[part] === undefined){
							current = current[part];
							break;
						}else{
							current = current[part];
						}

						if(lang.isFunction(current)){
							if(current.alters_data){
								current = "";
							}else{
								current = current.call(base);
							}
						}else if(current instanceof Date){
							current = dd._Context.prototype._normalize(current);
						}
					}else{
						return "";
					}
				}
			}
			return current;
		}
	});

	dd._TextNode = dd._Node = lang.extend(function(/*Object*/ obj){
		// summary:
		//		Basic catch-all node
		this.contents = obj;
	},
	{
		set: function(data){
			this.contents = data;
			return this;
		},
		render: function(context, buffer){
			// summary:
			//		Adds content onto the buffer
			return buffer.concat(this.contents);
		},
		isEmpty: function(){
			return !lang.trim(this.contents);
		},
		clone: function(){ return this; }
	});

	dd._NodeList = lang.extend(function(/*Node[]*/ nodes){
		// summary:
		//		Allows us to render a group of nodes
		this.contents = nodes || [];
		this.last = "";
	},
	{
		push: function(node){
			// summary:
			//		Add a new node to the list
			this.contents.push(node);
			return this;
		},
		concat: function(nodes){
			this.contents = this.contents.concat(nodes);
			return this;
		},
		render: function(context, buffer){
			// summary:
			//		Adds all content onto the buffer
			for(var i = 0; i < this.contents.length; i++){
				buffer = this.contents[i].render(context, buffer);
				if(!buffer) throw new Error("Template must return buffer");
			}
			return buffer;
		},
		dummyRender: function(context){
			return this.render(context, dd.Template.prototype.getBuffer()).toString();
		},
		unrender: function(){ return arguments[1]; },
		clone: function(){ return this; },
		rtrim: function(){
			while(1){
				i = this.contents.length - 1;
				if(this.contents[i] instanceof dd._TextNode && this.contents[i].isEmpty()){
					this.contents.pop();
				}else{
					break;
				}
			}

			return this;
		}
	});

	dd._VarNode = lang.extend(function(str){
		// summary:
		//		A node to be processed as a variable
		this.contents = new dd._Filter(str);
	},
	{
		render: function(context, buffer){
			var str = this.contents.resolve(context);
			if(!str.safe){
				str = dd._base.escape("" + str);
			}
			return buffer.concat(str);
		}
	});

	dd._noOpNode = new function(){
		// summary:
		//		Adds a no-op node. Useful in custom tags
		this.render = this.unrender = function(){ return arguments[1]; }
		this.clone = function(){ return this; }
	};

	dd._Parser = lang.extend(function(tokens){
		// summary:
		//		Parser used during initialization and for tag groups.
		this.contents = tokens;
	},
	{
		i: 0,
		parse: function(/*Array?*/ stop_at){
			// summary:
			//		Turns tokens into nodes
			// description:
			//		Steps into tags are they're found. Blocks use the parse object
			//		to find their closing tag (the stop_at array). stop_at is inclusive, it
			//		returns the node that matched.
			var terminators = {}, token;
			stop_at = stop_at || [];
			for(var i = 0; i < stop_at.length; i++){
				terminators[stop_at[i]] = true;
			}

			var nodelist = new dd._NodeList();
			while(this.i < this.contents.length){
				token = this.contents[this.i++];
				if(typeof token == "string"){
					nodelist.push(new dd._TextNode(token));
				}else{
					var type = token[0];
					var text = token[1];
					if(type == dd.TOKEN_VAR){
						nodelist.push(new dd._VarNode(text));
					}else if(type == dd.TOKEN_BLOCK){
						if(terminators[text]){
							--this.i;
							return nodelist;
						}
						var cmd = text.split(/\s+/g);
						if(cmd.length){
							cmd = cmd[0];
							var fn = ddt.getTag(cmd);
							if(fn){
								nodelist.push(fn(this, new dd.Token(type, text)));
							}
						}
					}
				}
			}

			if(stop_at.length){
				throw new Error("Could not find closing tag(s): " + stop_at.toString());
			}

			this.contents.length = 0;
			return nodelist;
		},
		next_token: function(){
			// summary:
			//		Returns the next token in the list.
			var token = this.contents[this.i++];
			return new dd.Token(token[0], token[1]);
		},
		delete_first_token: function(){
			this.i++;
		},
		skip_past: function(endtag){
			while(this.i < this.contents.length){
				var token = this.contents[this.i++];
				if(token[0] == dd.TOKEN_BLOCK && token[1] == endtag){
					return;
				}
			}
			throw new Error("Unclosed tag found when looking for " + endtag);
		},
		create_variable_node: function(expr){
			return new dd._VarNode(expr);
		},
		create_text_node: function(expr){
			return new dd._TextNode(expr || "");
		},
		getTemplate: function(file){
			return new dd.Template(file);
		}
	});

	dd.register = {
		// summary:
		//		A register for filters and tags.
		
		_registry: {
			attributes: [],
			tags: [],
			filters: []
		},
		get: function(/*String*/ module, /*String*/ name){
			// tags:
			//		private
			var registry = dd.register._registry[module + "s"];
			for(var i = 0, entry; entry = registry[i]; i++){
				if(typeof entry[0] == "string"){
					if(entry[0] == name){
						return entry;
					}
				}else if(name.match(entry[0])){
					return entry;
				}
			}
		},
		getAttributeTags: function(){
			// tags:
			//		private
			var tags = [];
			var registry = dd.register._registry.attributes;
			for(var i = 0, entry; entry = registry[i]; i++){
				if(entry.length == 3){
					tags.push(entry);
				}else{
					var fn = lang.getObject(entry[1]);
					if(fn && lang.isFunction(fn)){
						entry.push(fn);
						tags.push(entry);
					}
				}
			}
			return tags;
		},
		_any: function(type, base, locations){
			for(var path in locations){
				for(var i = 0, fn; fn = locations[path][i]; i++){
					var key = fn;
					if(lang.isArray(fn)){
						key = fn[0];
						fn = fn[1];
					}
					if(typeof key == "string"){
						if(key.substr(0, 5) == "attr:"){
							var attr = fn;
							if(attr.substr(0, 5) == "attr:"){
								attr = attr.slice(5);
							}
							dd.register._registry.attributes.push([attr.toLowerCase(), base + "." + path + "." + attr]);
						}
						key = key.toLowerCase()
					}
					dd.register._registry[type].push([
						key,
						fn,
						base + "." + path
					]);
				}
			}
		},
		tags: function(/*String*/ base, /*Object*/ locations){
			// summary:
			//		Register the specified tag libraries.
			// description:
			//		The locations parameter defines the contents of each library as a hash whose keys are the library names and values 
			//		an array of the tags exported by the library. For example, the tags exported by the logic library would be:
			//	|	{ logic: ["if", "for", "ifequal", "ifnotequal"] }
			// base:
			//		The base path of the libraries.
			// locations:
			//		An object defining the tags for each library as a hash whose keys are the library names and values 
			//		an array of the tags or filters exported by the library.
			dd.register._any("tags", base, locations);
		},
		filters: function(/*String*/ base, /*Object*/ locations){
			// summary:
			//		Register the specified filter libraries.
			// description:
			//		The locations parameter defines the contents of each library as a hash whose keys are the library names and values 
			//		an array of the filters exported by the library. For example, the filters exported by the date library would be:
			//	|	{ "dates": ["date", "time", "timesince", "timeuntil"] }
			// base:
			//		The base path of the libraries.
			// locations:
			//		An object defining the filters for each library as a hash whose keys are the library names and values 
			//		an array of the filters exported by the library.
			dd.register._any("filters", base, locations);
		}
	}

	var escapeamp = /&/g;
	var escapelt = /</g;
	var escapegt = />/g;
	var escapeqt = /'/g;
	var escapedblqt = /"/g;
	dd._base.escape = function(value){
		// summary:
		//		Escapes a string's HTML
		return dd.mark_safe(value.replace(escapeamp, '&amp;').replace(escapelt, '&lt;').replace(escapegt, '&gt;').replace(escapedblqt, '&quot;').replace(escapeqt, '&#39;'));
	};

	dd._base.safe = function(value){
		if(typeof value == "string"){
			value = new String(value);
		}
		if(typeof value == "object"){
			value.safe = true;
		}
		return value;
	};
	dd.mark_safe = dd._base.safe;

	dd.register.tags("dojox.dtl.tag", {
		"date": ["now"],
		"logic": ["if", "for", "ifequal", "ifnotequal"],
		"loader": ["extends", "block", "include", "load", "ssi"],
		"misc": ["comment", "debug", "filter", "firstof", "spaceless", "templatetag", "widthratio", "with"],
		"loop": ["cycle", "ifchanged", "regroup"]
	});
	dd.register.filters("dojox.dtl.filter", {
		"dates": ["date", "time", "timesince", "timeuntil"],
		"htmlstrings": ["linebreaks", "linebreaksbr", "removetags", "striptags"],
		"integers": ["add", "get_digit"],
		"lists": ["dictsort", "dictsortreversed", "first", "join", "length", "length_is", "random", "slice", "unordered_list"],
		"logic": ["default", "default_if_none", "divisibleby", "yesno"],
		"misc": ["filesizeformat", "pluralize", "phone2numeric", "pprint"],
		"strings": ["addslashes", "capfirst", "center", "cut", "fix_ampersands", "floatformat", "iriencode", "linenumbers", "ljust", "lower", "make_list", "rjust", "slugify", "stringformat", "title", "truncatewords", "truncatewords_html", "upper", "urlencode", "urlize", "urlizetrunc", "wordcount", "wordwrap"]
	});
	dd.register.filters("dojox.dtl", {
		"_base": ["escape", "safe"]
	});
	return dd;
});

