/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

/*
	This is an optimized version of Dojo, built for deployment and not for
	development. To get sources and documentation, please visit:

		http://dojotoolkit.org
*/

if(!dojo._hasResource["dojox.string.Builder"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.string.Builder"] = true;
dojo.provide("dojox.string.Builder");

dojox.string.Builder = function(/*String?*/str){
	//	summary:
	//		A fast buffer for creating large strings.
	//
	//	length: Number
	//		The current length of the internal string.

	//	N.B. the public nature of the internal buffer is no longer
	//	needed because the IE-specific fork is no longer needed--TRT.
	var b = "";
	this.length = 0;
	
	this.append = function(/* String... */s){
		// summary: Append all arguments to the end of the buffer
		if(arguments.length>1){
			/*
				This is a loop unroll was designed specifically for Firefox;
				it would seem that static index access on an Arguments
				object is a LOT faster than doing dynamic index access.
				Therefore, we create a buffer string and take advantage
				of JS's switch fallthrough.  The peformance of this method
				comes very close to straight up string concatenation (+=).

				If the arguments object length is greater than 9, we fall
				back to standard dynamic access.

				This optimization seems to have no real effect on either
				Safari or Opera, so we just use it for all.

				It turns out also that this loop unroll can increase performance
				significantly with Internet Explorer, particularly when
				as many arguments are provided as possible.

				Loop unroll per suggestion from Kris Zyp, implemented by
				Tom Trenka.

				Note: added empty string to force a string cast if needed.
			 */
			var tmp="", l=arguments.length;
			switch(l){
				case 9: tmp=""+arguments[8]+tmp;
				case 8: tmp=""+arguments[7]+tmp;
				case 7: tmp=""+arguments[6]+tmp;
				case 6: tmp=""+arguments[5]+tmp;
				case 5: tmp=""+arguments[4]+tmp;
				case 4: tmp=""+arguments[3]+tmp;
				case 3: tmp=""+arguments[2]+tmp;
				case 2: {
					b+=""+arguments[0]+arguments[1]+tmp;
					break;
				}
				default: {
					var i=0;
					while(i<arguments.length){
						tmp += arguments[i++];
					}
					b += tmp;
				}
			}
		} else {
			b += s;
		}
		this.length = b.length;
		return this;	//	dojox.string.Builder
	};
	
	this.concat = function(/*String...*/s){
		//	summary:
		//		Alias for append.
		return this.append.apply(this, arguments);	//	dojox.string.Builder
	};
	
	this.appendArray = function(/*Array*/strings) {
		//	summary:
		//		Append an array of items to the internal buffer.

		//	Changed from String.prototype.concat.apply because of IE.
		return this.append.apply(this, strings);	//	dojox.string.Builder
	};
	
	this.clear = function(){
		//	summary:
		//		Remove all characters from the buffer.
		b = "";
		this.length = 0;
		return this;	//	dojox.string.Builder
	};
	
	this.replace = function(/* String */oldStr, /* String */ newStr){
		// 	summary:
		//		Replace instances of one string with another in the buffer.
		b = b.replace(oldStr,newStr);
		this.length = b.length;
		return this;	//	dojox.string.Builder
	};
	
	this.remove = function(/* Number */start, /* Number? */len){
		//	summary:
		//		Remove len characters starting at index start.  If len
		//		is not provided, the end of the string is assumed.
		if(len===undefined){ len = b.length; }
		if(len == 0){ return this; }
		b = b.substr(0, start) + b.substr(start+len);
		this.length = b.length;
		return this;	//	dojox.string.Builder
	};
	
	this.insert = function(/* Number */index, /* String */str){
		//	summary:
		//		Insert string str starting at index.
		if(index == 0){
			b = str + b;
		}else{
			b = b.slice(0, index) + str + b.slice(index);
		}
		this.length = b.length;
		return this;	//	dojox.string.Builder
	};
	
	this.toString = function(){
		//	summary:
		//		Return the string representation of the internal buffer.
		return b;	//	String
	};

	//	initialize the buffer.
	if(str){ this.append(str); }
};

}

if(!dojo._hasResource["dojox.string.tokenize"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.string.tokenize"] = true;
dojo.provide("dojox.string.tokenize");

dojox.string.tokenize = function(/*String*/ str, /*RegExp*/ re, /*Function?*/ parseDelim, /*Object?*/ instance){
	// summary:
	//		Split a string by a regular expression with the ability to capture the delimeters
	// parseDelim:
	//		Each group (excluding the 0 group) is passed as a parameter. If the function returns
	//		a value, it's added to the list of tokens.
	// instance:
	//		Used as the "this" instance when calling parseDelim
	var tokens = [];
	var match, content, lastIndex = 0;
	while(match = re.exec(str)){
		content = str.slice(lastIndex, re.lastIndex - match[0].length);
		if(content.length){
			tokens.push(content);
		}
		if(parseDelim){
			if(dojo.isOpera){
				var copy = match.slice(0);
				while(copy.length < match.length){
					copy.push(null);
				}
				match = copy;
			}
			var parsed = parseDelim.apply(instance, match.slice(1).concat(tokens.length));
			if(typeof parsed != "undefined"){
				tokens.push(parsed);
			}
		}
		lastIndex = re.lastIndex;
	}
	content = str.slice(lastIndex);
	if(content.length){
		tokens.push(content);
	}
	return tokens;
}

}

if(!dojo._hasResource["dojox.dtl._base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl._base"] = true;
dojo.provide("dojox.dtl._base");




dojo.experimental("dojox.dtl");

(function(){
	var dd = dojox.dtl;

	dd.TOKEN_BLOCK = -1;
	dd.TOKEN_VAR = -2;
	dd.TOKEN_COMMENT = -3;
	dd.TOKEN_TEXT = 3;

	dd._Context = dojo.extend(function(dict){
		// summary: Pass one of these when rendering a template to tell the template what values to use.
		if(dict){
			dojo._mixin(this, dict);
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
			var context = dojo.delegate(this);
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
				if(typeof got != "undefined"){
					return n(got);
				}
			}

			if(typeof this[key] != "undefined"){
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
				dojo._mixin(this, dict);
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
		while(part = splitter.exec(this)){
			parts.push(this.slice(lastIndex, splitter.lastIndex - part[0].length));
			lastIndex = splitter.lastIndex;
			if(limit && (++i > limit - 1)){
				break;
			}
		}
		parts.push(this.slice(lastIndex));
		return parts;
	}

	dd.Token = function(token_type, contents){
		this.token_type = token_type;
		this.contents = new String(dojo.trim(contents));
		this.contents.split = split;
		this.split = function(){
			return String.prototype.split.apply(this.contents, arguments);
		}
	}
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
	}

	var ddt = dd.text = {
		_get: function(module, name, errorless){
			// summary: Used to find both tags and filters
			var params = dd.register.get(module, name.toLowerCase(), errorless);
			if(!params){
				if(!errorless){
					throw new Error("No tag found for " + name);
				}
				return null;
			}

			var fn = params[1];
			var require = params[2];

			var parts;
			if(fn.indexOf(":") != -1){
				parts = fn.split(":");
				fn = parts.pop();
			}

			dojo["require"](require);

			var parent = dojo.getObject(require);

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
			return dojo._getText(file.toString()) || "";
		},
		_resolveLazy: function(location, sync, json){
			if(sync){
				if(json){
					return dojo.fromJson(dojo._getText(location)) || {};
				}else{
					return dd.text.getTemplateString(location);
				}
			}else{
				return dojo.xhrGet({
					handleAs: (json) ? "json" : "text",
					url: location
				});
			}
		},
		_resolveTemplateArg: function(arg, sync){
			if(ddt._isTemplate(arg)){
				if(!sync){
					var d = new dojo.Deferred();
					d.callback(arg);
					return d;
				}
				return arg;
			}
			return ddt._resolveLazy(arg, sync);
		},
		_isTemplate: function(arg){
			return (typeof arg == "undefined") || (typeof arg == "string" && (arg.match(/^\s*[<{]/) || arg.indexOf(" ") != -1));
		},
		_resolveContextArg: function(arg, sync){
			if(arg.constructor == Object){
				if(!sync){
					var d = new dojo.Deferred;
					d.callback(arg);
					return d;
				}
				return arg;
			}
			return ddt._resolveLazy(arg, sync, true);
		},
		_re: /(?:\{\{\s*(.+?)\s*\}\}|\{%\s*(load\s*)?(.+?)\s*%\})/g,
		tokenize: function(str){
			return dojox.string.tokenize(str, ddt._re, ddt._parseDelims);
		},
		_parseDelims: function(varr, load, tag){
			if(varr){
				return [dd.TOKEN_VAR, varr];
			}else if(load){
				var parts = dojo.trim(tag).split(/\s+/g);
				for(var i = 0, part; part = parts[i]; i++){
					dojo["require"](part);
				}
			}else{
				return [dd.TOKEN_BLOCK, tag];
			}
		}
	}

	dd.Template = dojo.extend(function(/*String|dojo._Url*/ template, /*Boolean*/ isString){
		// template:
		//		The string or location of the string to
		//		use as a template
		var str = isString ? template : ddt._resolveTemplateArg(template, true) || "";
		var tokens = ddt.tokenize(str);
		var parser = new dd._Parser(tokens);
		this.nodelist = parser.parse();
	},
	{
		update: function(node, context){
			// node: DOMNode|String|dojo.NodeList
			//		A node reference or set of nodes
			// context: dojo._Url|String|Object
			//		The context object or location
			return ddt._resolveContextArg(context).addCallback(this, function(contextObject){
				var content = this.render(new dd._Context(contextObject));
				if(node.forEach){
					node.forEach(function(item){
						item.innerHTML = content;
					});
				}else{
					dojo.byId(node).innerHTML = content;
				}
				return this;
			});
		},
		render: function(context, /*concatenatable?*/ buffer){
			buffer = buffer || this.getBuffer();
			context = context || new dd._Context({});
			return this.nodelist.render(context, buffer) + "";
		},
		getBuffer: function(){
			
			return new dojox.string.Builder();
		}
	});

	var qfRe = /\{\{\s*(.+?)\s*\}\}/g;
	dd.quickFilter = function(str){
		if(!str){
			return new dd._NodeList();
		}

		if(str.indexOf("{%") == -1){
			return new dd._QuickNodeList(dojox.string.tokenize(str, qfRe, function(token){
				return new dd._Filter(token);
			}));
		}
	}

	dd._QuickNodeList = dojo.extend(function(contents){
		this.contents = contents;
	},
	{
		render: function(context, buffer){
			for(var i=0, l=this.contents.length; i<l; i++){
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

	dd._Filter = dojo.extend(function(token){
		// summary: Uses a string to find (and manipulate) a variable
		if(!token) throw new Error("Filter must be called with variable name");
		this.contents = token;

		var cache = this._cache[token];
		if(cache){
			this.key = cache[0];
			this.filters = cache[1];
		}else{
			this.filters = [];
			dojox.string.tokenize(token, this._re, this._tokenize, this);
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
				has[i] = (typeof arguments[i] != "undefined" && typeof arguments[i] == "string" && arguments[i]);
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
				if(!dojo.isFunction(fn)) throw new Error(arguments[3] + " is not registered as a filter");
				this.filters.push([fn, arg]);
			}
		},
		getExpression: function(){
			return this.contents;
		},
		resolve: function(context){
			if(typeof this.key == "undefined"){
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

				if(dojo.isFunction(current)){
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
						if(dojo.isObject(current) && part == "items" && typeof current[part] == "undefined"){
							var items = [];
							for(var key in current){
								items.push([key, current[key]]);
							}
							current = items;
							continue;
						}

						if(current.get && dojo.isFunction(current.get) && current.get.safe){
							current = current.get(part);
						}else if(typeof current[part] == "undefined"){
							current = current[part];
							break;
						}else{
							current = current[part];
						}

						if(dojo.isFunction(current)){
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

	dd._TextNode = dd._Node = dojo.extend(function(/*Object*/ obj){
		// summary: Basic catch-all node
		this.contents = obj;
	},
	{
		set: function(data){
			this.contents = data;
			return this;
		},
		render: function(context, buffer){
			// summary: Adds content onto the buffer
			return buffer.concat(this.contents);
		},
		isEmpty: function(){
			return !dojo.trim(this.contents);
		},
		clone: function(){ return this; }
	});

	dd._NodeList = dojo.extend(function(/*Node[]*/ nodes){
		// summary: Allows us to render a group of nodes
		this.contents = nodes || [];
		this.last = "";
	},
	{
		push: function(node){
			// summary: Add a new node to the list
			this.contents.push(node);
			return this;
		},
		concat: function(nodes){
			this.contents = this.contents.concat(nodes);
			return this;
		},
		render: function(context, buffer){
			// summary: Adds all content onto the buffer
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

	dd._VarNode = dojo.extend(function(str){
		// summary: A node to be processed as a variable
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
		// summary: Adds a no-op node. Useful in custom tags
		this.render = this.unrender = function(){ return arguments[1]; }
		this.clone = function(){ return this; }
	}

	dd._Parser = dojo.extend(function(tokens){
		// summary: Parser used during initialization and for tag groups.
		this.contents = tokens;
	},
	{
		i: 0,
		parse: function(/*Array?*/ stop_at){
			// summary: Turns tokens into nodes
			// description: Steps into tags are they're found. Blocks use the parse object
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
			// summary: Returns the next token in the list.
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
		_registry: {
			attributes: [],
			tags: [],
			filters: []
		},
		get: function(/*String*/ module, /*String*/ name){
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
			var tags = [];
			var registry = dd.register._registry.attributes;
			for(var i = 0, entry; entry = registry[i]; i++){
				if(entry.length == 3){
					tags.push(entry);
				}else{
					var fn = dojo.getObject(entry[1]);
					if(fn && dojo.isFunction(fn)){
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
					if(dojo.isArray(fn)){
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
			dd.register._any("tags", base, locations);
		},
		filters: function(/*String*/ base, /*Object*/ locations){
			dd.register._any("filters", base, locations);
		}
	}

	var escapeamp = /&/g;
	var escapelt = /</g;
	var escapegt = />/g;
	var escapeqt = /'/g;
	var escapedblqt = /"/g;
	dd._base.escape = function(value){
		// summary: Escapes a string's HTML
		return dd.mark_safe(value.replace(escapeamp, '&amp;').replace(escapelt, '&lt;').replace(escapegt, '&gt;').replace(escapedblqt, '&quot;').replace(escapeqt, '&#39;'));
	}

	dd._base.safe = function(value){
		if(typeof value == "string"){
			value = new String(value);
		}
		if(typeof value == "object"){
			value.safe = true;
		}
		return value;
	}
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
})();

}

if(!dojo._hasResource["dojox.dtl"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl"] = true;
dojo.provide("dojox.dtl");


}

if(!dojo._hasResource["dojox.dtl.Context"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.Context"] = true;
dojo.provide("dojox.dtl.Context");


dojox.dtl.Context = dojo.extend(function(dict){
	this._this = {};
	dojox.dtl._Context.call(this, dict);
}, dojox.dtl._Context.prototype,
{
	getKeys: function(){
		var keys = [];
		for(var key in this){
			if(this.hasOwnProperty(key) && key != "_this"){
				keys.push(key);
			}
		}
		return keys;
	},
	extend: function(/*dojox.dtl.Context|Object*/ obj){
		// summary: Returns a clone of this context object, with the items from the
		//		passed objecct mixed in.
		return  dojo.delegate(this, obj);
	},
	filter: function(/*dojox.dtl.Context|Object|String...*/ filter){
		// summary: Returns a clone of this context, only containing the items
		//		defined in the filter.
		var context = new dojox.dtl.Context();
		var keys = [];
		var i, arg;
		if(filter instanceof dojox.dtl.Context){
			keys = filter.getKeys();
		}else if(typeof filter == "object"){
			for(var key in filter){
				keys.push(key);
			}
		}else{
			for(i = 0; arg = arguments[i]; i++){
				if(typeof arg == "string"){
					keys.push(arg);
				}
			}
		}

		for(i = 0, key; key = keys[i]; i++){
			context[key] = this[key];
		}

		return context;
	},
	setThis: function(/*Object*/ _this){
		this._this = _this;
	},
	getThis: function(){
		return this._this;
	},
	hasKey: function(key){
		if(this._getter){
			var got = this._getter(key);
			if(typeof got != "undefined"){
				return true;
			}
		}

		if(typeof this[key] != "undefined"){
			return true;
		}

		return false;
	}
});

}

if(!dojo._hasResource["dojox.dtl.tag.logic"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.tag.logic"] = true;
dojo.provide("dojox.dtl.tag.logic");



(function(){
	var dd = dojox.dtl;
	var ddt = dd.text;
	var ddtl = dd.tag.logic;

	ddtl.IfNode = dojo.extend(function(bools, trues, falses, type){
		this.bools = bools;
		this.trues = trues;
		this.falses = falses;
		this.type = type;
	},
	{
		render: function(context, buffer){
			var i, bool, ifnot, filter, value;
			if(this.type == "or"){
				for(i = 0; bool = this.bools[i]; i++){
					ifnot = bool[0];
					filter = bool[1];
					value = filter.resolve(context);
					if((value && !ifnot) || (ifnot && !value)){
						if(this.falses){
							buffer = this.falses.unrender(context, buffer);
						}
						return (this.trues) ? this.trues.render(context, buffer, this) : buffer;
					}
				}
				if(this.trues){
					buffer = this.trues.unrender(context, buffer);
				}
				return (this.falses) ? this.falses.render(context, buffer, this) : buffer;
			}else{
				for(i = 0; bool = this.bools[i]; i++){
					ifnot = bool[0];
					filter = bool[1];
					value = filter.resolve(context);
					// If we ever encounter a false value
					if(value == ifnot){
						if(this.trues){
							buffer = this.trues.unrender(context, buffer);
						}
						return (this.falses) ? this.falses.render(context, buffer, this) : buffer;
					}
				}
				if(this.falses){
					buffer = this.falses.unrender(context, buffer);
				}
				return (this.trues) ? this.trues.render(context, buffer, this) : buffer;
			}
			return buffer;
		},
		unrender: function(context, buffer){
			buffer = (this.trues) ? this.trues.unrender(context, buffer) : buffer;
			buffer = (this.falses) ? this.falses.unrender(context, buffer) : buffer;
			return buffer;
		},
		clone: function(buffer){
			var trues = (this.trues) ? this.trues.clone(buffer) : null;
			var falses = (this.falses) ? this.falses.clone(buffer) : null;
			return new this.constructor(this.bools, trues, falses, this.type);
		}
	});

	ddtl.IfEqualNode = dojo.extend(function(var1, var2, trues, falses, negate){
		this.var1 = new dd._Filter(var1);
		this.var2 = new dd._Filter(var2);
		this.trues = trues;
		this.falses = falses;
		this.negate = negate;
	},
	{
		render: function(context, buffer){
			var var1 = this.var1.resolve(context);
			var var2 = this.var2.resolve(context);
			var1 = (typeof var1 != "undefined") ? var1 : "";
			var2 = (typeof var1 != "undefined") ? var2 : "";
			if((this.negate && var1 != var2) || (!this.negate && var1 == var2)){
				if(this.falses){
					buffer = this.falses.unrender(context, buffer, this);
				}
				return (this.trues) ? this.trues.render(context, buffer, this) : buffer;
			}
			if(this.trues){
				buffer = this.trues.unrender(context, buffer, this);
			}
			return (this.falses) ? this.falses.render(context, buffer, this) : buffer;
		},
		unrender: function(context, buffer){
			return ddtl.IfNode.prototype.unrender.call(this, context, buffer);
		},
		clone: function(buffer){
			var trues = this.trues ? this.trues.clone(buffer) : null;
			var falses = this.falses ? this.falses.clone(buffer) : null;
			return new this.constructor(this.var1.getExpression(), this.var2.getExpression(), trues, falses, this.negate);
		}
	});

	ddtl.ForNode = dojo.extend(function(assign, loop, reversed, nodelist){
		this.assign = assign;
		this.loop = new dd._Filter(loop);
		this.reversed = reversed;
		this.nodelist = nodelist;
		this.pool = [];
	},
	{
		render: function(context, buffer){
			var i, j, k;
			var dirty = false;
			var assign = this.assign;

			for(k = 0; k < assign.length; k++){
				if(typeof context[assign[k]] != "undefined"){
					dirty = true;
					context = context.push();
					break;
				}
			}
			if(!dirty && context.forloop){
				dirty = true;
				context = context.push();
			}

			var items = this.loop.resolve(context) || [];
			for(i = items.length; i < this.pool.length; i++){
				this.pool[i].unrender(context, buffer, this);
			}
			if(this.reversed){
				items = items.slice(0).reverse();
			}

			var isObject = dojo.isObject(items) && !dojo.isArrayLike(items);
			var arred = [];
			if(isObject){
				for(var key in items){
					arred.push(items[key]);
				}
			}else{
				arred = items;
			}

			var forloop = context.forloop = {
				parentloop: context.get("forloop", {})
			};
			var j = 0;
			for(i = 0; i < arred.length; i++){
				var item = arred[i];

				forloop.counter0 = j;
				forloop.counter = j + 1;
				forloop.revcounter0 = arred.length - j - 1;
				forloop.revcounter = arred.length - j;
				forloop.first = !j;
				forloop.last = (j == arred.length - 1);

				if(assign.length > 1 && dojo.isArrayLike(item)){
					if(!dirty){
						dirty = true;
						context = context.push();
					}
					var zipped = {};
					for(k = 0; k < item.length && k < assign.length; k++){
						zipped[assign[k]] = item[k];
					}
					dojo.mixin(context, zipped);
				}else{
					context[assign[0]] = item;
				}

				if(j + 1 > this.pool.length){
					this.pool.push(this.nodelist.clone(buffer));
				}
				buffer = this.pool[j++].render(context, buffer, this);
			}

			delete context.forloop;
			if(dirty){
				context = context.pop();
			}else{
				for(k = 0; k < assign.length; k++){
					delete context[assign[k]];
				}
			}
			return buffer;
		},
		unrender: function(context, buffer){
			for(var i = 0, pool; pool = this.pool[i]; i++){
				buffer = pool.unrender(context, buffer);
			}
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this.assign, this.loop.getExpression(), this.reversed, this.nodelist.clone(buffer));
		}
	});

	dojo.mixin(ddtl, {
		if_: function(parser, token){
			var i, part, type, bools = [], parts = token.contents.split();
			parts.shift();
			token = parts.join(" ");
			parts = token.split(" and ");
			if(parts.length == 1){
				type = "or";
				parts = token.split(" or ");
			}else{
				type = "and";
				for(i = 0; i < parts.length; i++){
					if(parts[i].indexOf(" or ") != -1){
						// Note, since we split by and, this is the only place we need to error check
						throw new Error("'if' tags can't mix 'and' and 'or'");
					}
				}
			}
			for(i = 0; part = parts[i]; i++){
				var not = false;
				if(part.indexOf("not ") == 0){
					part = part.slice(4);
					not = true;
				}
				bools.push([not, new dd._Filter(part)]);
			}
			var trues = parser.parse(["else", "endif"]);
			var falses = false;
			var token = parser.next_token();
			if(token.contents == "else"){
				falses = parser.parse(["endif"]);
				parser.next_token();
			}
			return new ddtl.IfNode(bools, trues, falses, type);
		},
		_ifequal: function(parser, token, negate){
			var parts = token.split_contents();
			if(parts.length != 3){
				throw new Error(parts[0] + " takes two arguments");
			}
			var end = 'end' + parts[0];
			var trues = parser.parse(["else", end]);
			var falses = false;
			var token = parser.next_token();
			if(token.contents == "else"){
				falses = parser.parse([end]);
				parser.next_token();
			}
			return new ddtl.IfEqualNode(parts[1], parts[2], trues, falses, negate);
		},
		ifequal: function(parser, token){
			return ddtl._ifequal(parser, token);
		},
		ifnotequal: function(parser, token){
			return ddtl._ifequal(parser, token, true);
		},
		for_: function(parser, token){
			var parts = token.contents.split();
			if(parts.length < 4){
				throw new Error("'for' statements should have at least four words: " + token.contents);
			}
			var reversed = parts[parts.length - 1] == "reversed";
			var index = (reversed) ? -3 : -2;
			if(parts[parts.length + index] != "in"){
				throw new Error("'for' tag received an invalid argument: " + token.contents);
			}
			var loopvars = parts.slice(1, index).join(" ").split(/ *, */);
			for(var i = 0; i < loopvars.length; i++){
				if(!loopvars[i] || loopvars[i].indexOf(" ") != -1){
					throw new Error("'for' tag received an invalid argument: " + token.contents);
				}
			}
			var nodelist = parser.parse(["endfor"]);
			parser.next_token();
			return new ddtl.ForNode(loopvars, parts[parts.length + index + 1], reversed, nodelist);
		}
	});
})();

}

if(!dojo._hasResource["dojox.dtl.tag.loop"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.tag.loop"] = true;
dojo.provide("dojox.dtl.tag.loop");




(function(){
	var dd = dojox.dtl;
	var ddtl = dd.tag.loop;

	ddtl.CycleNode = dojo.extend(function(cyclevars, name, text, shared){
		this.cyclevars = cyclevars;
		this.name = name;
		this.contents = text;
		this.shared = shared || {counter: -1, map: {}};
	},
	{
		render: function(context, buffer){
			if(context.forloop && !context.forloop.counter0){
				this.shared.counter = -1;
			}

			++this.shared.counter;
			var value = this.cyclevars[this.shared.counter % this.cyclevars.length];

			var map = this.shared.map;
			if(!map[value]){
				map[value] = new dd._Filter(value);
			}
			value = map[value].resolve(context, buffer);

			if(this.name){
				context[this.name] = value;
			}
			this.contents.set(value);
			return this.contents.render(context, buffer);
		},
		unrender: function(context, buffer){
			return this.contents.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.cyclevars, this.name, this.contents.clone(buffer), this.shared);
		}
	});

	ddtl.IfChangedNode = dojo.extend(function(nodes, vars, shared){
		this.nodes = nodes;
		this._vars = vars;
		this.shared = shared || {last: null, counter: 0};
		this.vars = dojo.map(vars, function(item){
			return new dojox.dtl._Filter(item);
		});
	}, {
		render: function(context, buffer){
			if(context.forloop){
				if(context.forloop.counter <= this.shared.counter){
					this.shared.last = null;
				}
				this.shared.counter = context.forloop.counter;
			}

			var change;
			if(this.vars.length){
				change = dojo.toJson(dojo.map(this.vars, function(item){
					return item.resolve(context);
				}));
			}else{
				change = this.nodes.dummyRender(context, buffer);
			}

			if(change != this.shared.last){
				var firstloop = (this.shared.last === null);
				this.shared.last = change;
				context = context.push();
				context.ifchanged = {firstloop: firstloop};
				buffer = this.nodes.render(context, buffer);
				context = context.pop();
			}else{
				buffer = this.nodes.unrender(context, buffer);
			}
			return buffer;
		},
		unrender: function(context, buffer){
			return this.nodes.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.nodes.clone(buffer), this._vars, this.shared);
		}
	});

	ddtl.RegroupNode = dojo.extend(function(expression, key, alias){
		this._expression = expression;
		this.expression = new dd._Filter(expression);
		this.key = key;
		this.alias = alias;
	},
	{
		_push: function(container, grouper, stack){
			if(stack.length){
				container.push({ grouper: grouper, list: stack });
			}
		},
		render: function(context, buffer){
			context[this.alias] = [];
			var list = this.expression.resolve(context);
			if(list){
				var last = null;
				var stack = [];
				for(var i = 0; i < list.length; i++){
					var id = list[i][this.key];
					if(last !== id){
						this._push(context[this.alias], last, stack);
						last = id;
						stack = [list[i]];
					}else{
						stack.push(list[i]);
					}
				}
				this._push(context[this.alias], last, stack);
			}
			return buffer;
		},
		unrender: function(context, buffer){
			return buffer;
		},
		clone: function(context, buffer){
			return this;
		}
	});

	dojo.mixin(ddtl, {
		cycle: function(parser, token){
			// summary: Cycle among the given strings each time this tag is encountered
			var args = token.split_contents();

			if(args.length < 2){
				throw new Error("'cycle' tag requires at least two arguments");
			}

			if(args[1].indexOf(",") != -1){
				var vars = args[1].split(",");
				args = [args[0]];
				for(var i = 0; i < vars.length; i++){
					args.push('"' + vars[i] + '"');
				}
			}

			if(args.length == 2){
				var name = args[args.length - 1];

				if(!parser._namedCycleNodes){
					throw new Error("No named cycles in template: '" + name + "' is not defined");
				}
				if(!parser._namedCycleNodes[name]){
					throw new Error("Named cycle '" + name + "' does not exist");
				}

		        return parser._namedCycleNodes[name];
			}

			if(args.length > 4 && args[args.length - 2] == "as"){
				var name = args[args.length - 1];

				var node = new ddtl.CycleNode(args.slice(1, args.length - 2), name, parser.create_text_node());

				if(!parser._namedCycleNodes){
					parser._namedCycleNodes = {};
				}
				parser._namedCycleNodes[name] = node;
			}else{
				node = new ddtl.CycleNode(args.slice(1), null, parser.create_text_node());
			}

			return node;
		},
		ifchanged: function(parser, token){
			var parts = token.contents.split();
			var nodes = parser.parse(["endifchanged"]);
			parser.delete_first_token();
			return new ddtl.IfChangedNode(nodes, parts.slice(1));
		},
		regroup: function(parser, token){
			var tokens = dojox.string.tokenize(token.contents, /(\s+)/g, function(spaces){
				return spaces;
			});
			if(tokens.length < 11 || tokens[tokens.length - 3] != "as" || tokens[tokens.length - 7] != "by"){
				throw new Error("Expected the format: regroup list by key as newList");
			}
			var expression = tokens.slice(2, -8).join("");
			var key = tokens[tokens.length - 5];
			var alias = tokens[tokens.length - 1];
			return new ddtl.RegroupNode(expression, key, alias);
		}
	});
})();

}

if(!dojo._hasResource["dojo.date"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.date"] = true;
dojo.provide("dojo.date");

dojo.getObject("date", true, dojo);

/*=====
dojo.date = {
	// summary: Date manipulation utilities
}
=====*/

dojo.date.getDaysInMonth = function(/*Date*/dateObject){
	//	summary:
	//		Returns the number of days in the month used by dateObject
	var month = dateObject.getMonth();
	var days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	if(month == 1 && dojo.date.isLeapYear(dateObject)){ return 29; } // Number
	return days[month]; // Number
};

dojo.date.isLeapYear = function(/*Date*/dateObject){
	//	summary:
	//		Determines if the year of the dateObject is a leap year
	//	description:
	//		Leap years are years with an additional day YYYY-02-29, where the
	//		year number is a multiple of four with the following exception: If
	//		a year is a multiple of 100, then it is only a leap year if it is
	//		also a multiple of 400. For example, 1900 was not a leap year, but
	//		2000 is one.

	var year = dateObject.getFullYear();
	return !(year%400) || (!(year%4) && !!(year%100)); // Boolean
};

// FIXME: This is not localized
dojo.date.getTimezoneName = function(/*Date*/dateObject){
	//	summary:
	//		Get the user's time zone as provided by the browser
	// dateObject:
	//		Needed because the timezone may vary with time (daylight savings)
	//	description:
	//		Try to get time zone info from toString or toLocaleString method of
	//		the Date object -- UTC offset is not a time zone.  See
	//		http://www.twinsun.com/tz/tz-link.htm Note: results may be
	//		inconsistent across browsers.

	var str = dateObject.toString(); // Start looking in toString
	var tz = ''; // The result -- return empty string if nothing found
	var match;

	// First look for something in parentheses -- fast lookup, no regex
	var pos = str.indexOf('(');
	if(pos > -1){
		tz = str.substring(++pos, str.indexOf(')'));
	}else{
		// If at first you don't succeed ...
		// If IE knows about the TZ, it appears before the year
		// Capital letters or slash before a 4-digit year
		// at the end of string
		var pat = /([A-Z\/]+) \d{4}$/;
		if((match = str.match(pat))){
			tz = match[1];
		}else{
		// Some browsers (e.g. Safari) glue the TZ on the end
		// of toLocaleString instead of putting it in toString
			str = dateObject.toLocaleString();
			// Capital letters or slash -- end of string,
			// after space
			pat = / ([A-Z\/]+)$/;
			if((match = str.match(pat))){
				tz = match[1];
			}
		}
	}

	// Make sure it doesn't somehow end up return AM or PM
	return (tz == 'AM' || tz == 'PM') ? '' : tz; // String
};

// Utility methods to do arithmetic calculations with Dates

dojo.date.compare = function(/*Date*/date1, /*Date?*/date2, /*String?*/portion){
	//	summary:
	//		Compare two date objects by date, time, or both.
	//	description:
	//  	Returns 0 if equal, positive if a > b, else negative.
	//	date1:
	//		Date object
	//	date2:
	//		Date object.  If not specified, the current Date is used.
	//	portion:
	//		A string indicating the "date" or "time" portion of a Date object.
	//		Compares both "date" and "time" by default.  One of the following:
	//		"date", "time", "datetime"

	// Extra step required in copy for IE - see #3112
	date1 = new Date(+date1);
	date2 = new Date(+(date2 || new Date()));

	if(portion == "date"){
		// Ignore times and compare dates.
		date1.setHours(0, 0, 0, 0);
		date2.setHours(0, 0, 0, 0);
	}else if(portion == "time"){
		// Ignore dates and compare times.
		date1.setFullYear(0, 0, 0);
		date2.setFullYear(0, 0, 0);
	}
	
	if(date1 > date2){ return 1; } // int
	if(date1 < date2){ return -1; } // int
	return 0; // int
};

dojo.date.add = function(/*Date*/date, /*String*/interval, /*int*/amount){
	//	summary:
	//		Add to a Date in intervals of different size, from milliseconds to years
	//	date: Date
	//		Date object to start with
	//	interval:
	//		A string representing the interval.  One of the following:
	//			"year", "month", "day", "hour", "minute", "second",
	//			"millisecond", "quarter", "week", "weekday"
	//	amount:
	//		How much to add to the date.

	var sum = new Date(+date); // convert to Number before copying to accomodate IE (#3112)
	var fixOvershoot = false;
	var property = "Date";

	switch(interval){
		case "day":
			break;
		case "weekday":
			//i18n FIXME: assumes Saturday/Sunday weekend, but this is not always true.  see dojo.cldr.supplemental

			// Divide the increment time span into weekspans plus leftover days
			// e.g., 8 days is one 5-day weekspan / and two leftover days
			// Can't have zero leftover days, so numbers divisible by 5 get
			// a days value of 5, and the remaining days make up the number of weeks
			var days, weeks;
			var mod = amount % 5;
			if(!mod){
				days = (amount > 0) ? 5 : -5;
				weeks = (amount > 0) ? ((amount-5)/5) : ((amount+5)/5);
			}else{
				days = mod;
				weeks = parseInt(amount/5);
			}
			// Get weekday value for orig date param
			var strt = date.getDay();
			// Orig date is Sat / positive incrementer
			// Jump over Sun
			var adj = 0;
			if(strt == 6 && amount > 0){
				adj = 1;
			}else if(strt == 0 && amount < 0){
			// Orig date is Sun / negative incrementer
			// Jump back over Sat
				adj = -1;
			}
			// Get weekday val for the new date
			var trgt = strt + days;
			// New date is on Sat or Sun
			if(trgt == 0 || trgt == 6){
				adj = (amount > 0) ? 2 : -2;
			}
			// Increment by number of weeks plus leftover days plus
			// weekend adjustments
			amount = (7 * weeks) + days + adj;
			break;
		case "year":
			property = "FullYear";
			// Keep increment/decrement from 2/29 out of March
			fixOvershoot = true;
			break;
		case "week":
			amount *= 7;
			break;
		case "quarter":
			// Naive quarter is just three months
			amount *= 3;
			// fallthrough...
		case "month":
			// Reset to last day of month if you overshoot
			fixOvershoot = true;
			property = "Month";
			break;
//		case "hour":
//		case "minute":
//		case "second":
//		case "millisecond":
		default:
			property = "UTC"+interval.charAt(0).toUpperCase() + interval.substring(1) + "s";
	}

	if(property){
		sum["set"+property](sum["get"+property]()+amount);
	}

	if(fixOvershoot && (sum.getDate() < date.getDate())){
		sum.setDate(0);
	}

	return sum; // Date
};

dojo.date.difference = function(/*Date*/date1, /*Date?*/date2, /*String?*/interval){
	//	summary:
	//		Get the difference in a specific unit of time (e.g., number of
	//		months, weeks, days, etc.) between two dates, rounded to the
	//		nearest integer.
	//	date1:
	//		Date object
	//	date2:
	//		Date object.  If not specified, the current Date is used.
	//	interval:
	//		A string representing the interval.  One of the following:
	//			"year", "month", "day", "hour", "minute", "second",
	//			"millisecond", "quarter", "week", "weekday"
	//		Defaults to "day".

	date2 = date2 || new Date();
	interval = interval || "day";
	var yearDiff = date2.getFullYear() - date1.getFullYear();
	var delta = 1; // Integer return value

	switch(interval){
		case "quarter":
			var m1 = date1.getMonth();
			var m2 = date2.getMonth();
			// Figure out which quarter the months are in
			var q1 = Math.floor(m1/3) + 1;
			var q2 = Math.floor(m2/3) + 1;
			// Add quarters for any year difference between the dates
			q2 += (yearDiff * 4);
			delta = q2 - q1;
			break;
		case "weekday":
			var days = Math.round(dojo.date.difference(date1, date2, "day"));
			var weeks = parseInt(dojo.date.difference(date1, date2, "week"));
			var mod = days % 7;

			// Even number of weeks
			if(mod == 0){
				days = weeks*5;
			}else{
				// Weeks plus spare change (< 7 days)
				var adj = 0;
				var aDay = date1.getDay();
				var bDay = date2.getDay();

				weeks = parseInt(days/7);
				mod = days % 7;
				// Mark the date advanced by the number of
				// round weeks (may be zero)
				var dtMark = new Date(date1);
				dtMark.setDate(dtMark.getDate()+(weeks*7));
				var dayMark = dtMark.getDay();

				// Spare change days -- 6 or less
				if(days > 0){
					switch(true){
						// Range starts on Sat
						case aDay == 6:
							adj = -1;
							break;
						// Range starts on Sun
						case aDay == 0:
							adj = 0;
							break;
						// Range ends on Sat
						case bDay == 6:
							adj = -1;
							break;
						// Range ends on Sun
						case bDay == 0:
							adj = -2;
							break;
						// Range contains weekend
						case (dayMark + mod) > 5:
							adj = -2;
					}
				}else if(days < 0){
					switch(true){
						// Range starts on Sat
						case aDay == 6:
							adj = 0;
							break;
						// Range starts on Sun
						case aDay == 0:
							adj = 1;
							break;
						// Range ends on Sat
						case bDay == 6:
							adj = 2;
							break;
						// Range ends on Sun
						case bDay == 0:
							adj = 1;
							break;
						// Range contains weekend
						case (dayMark + mod) < 0:
							adj = 2;
					}
				}
				days += adj;
				days -= (weeks*2);
			}
			delta = days;
			break;
		case "year":
			delta = yearDiff;
			break;
		case "month":
			delta = (date2.getMonth() - date1.getMonth()) + (yearDiff * 12);
			break;
		case "week":
			// Truncate instead of rounding
			// Don't use Math.floor -- value may be negative
			delta = parseInt(dojo.date.difference(date1, date2, "day")/7);
			break;
		case "day":
			delta /= 24;
			// fallthrough
		case "hour":
			delta /= 60;
			// fallthrough
		case "minute":
			delta /= 60;
			// fallthrough
		case "second":
			delta /= 1000;
			// fallthrough
		case "millisecond":
			delta *= date2.getTime() - date1.getTime();
	}

	// Round for fractional values and DST leaps
	return Math.round(delta); // Number (integer)
};

}

if(!dojo._hasResource["dojox.date.php"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.date.php"] = true;
dojo.provide("dojox.date.php");



dojox.date.php.format = function(/*Date*/ date, /*String*/ format){
	// summary: Get a formatted string for a given date object
	var df = new dojox.date.php.DateFormat(format);
	return df.format(date);
}

dojox.date.php.DateFormat = function(/*String*/ format){
	// summary: Format the internal date object
	if(!this.regex){
		var keys = [];
		for(var key in this.constructor.prototype){
			if(dojo.isString(key) && key.length == 1 && dojo.isFunction(this[key])){
				keys.push(key);
			}
		}
		this.constructor.prototype.regex = new RegExp("(?:(\\\\.)|([" + keys.join("") + "]))", "g");
	}

	var replacements = [];

	this.tokens = dojox.string.tokenize(format, this.regex, function(escape, token, i){
		if(token){
			replacements.push([i, token]);
			return token;
		}
		if(escape){
			return escape.charAt(1);
		}
	});

	this.replacements = replacements;
}
dojo.extend(dojox.date.php.DateFormat, {
	weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	weekdays_3: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
	months_3: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	monthdays: [31,28,31,30,31,30,31,31,30,31,30,31],

	format: function(/*Date*/ date){
		this.date = date;
		for(var i = 0, replacement; replacement = this.replacements[i]; i++){
			this.tokens[replacement[0]] = this[replacement[1]]();
		}
		return this.tokens.join("");
	},

	// Day

	d: function(){
		// summary: Day of the month, 2 digits with leading zeros
		var j = this.j();
		return (j.length == 1) ? "0" + j : j;
	},

	D: function(){
		// summary: A textual representation of a day, three letters
		return this.weekdays_3[this.date.getDay()];
	},

	j: function(){
		// summary: Day of the month without leading zeros
		return this.date.getDate() + "";
	},

	l: function(){
		// summary: A full textual representation of the day of the week
		return this.weekdays[this.date.getDay()];
	},
	
	N: function(){
		// summary: ISO-8601 numeric representation of the day of the week (added in PHP 5.1.0)
		var w = this.w();
		return (!w) ? 7 : w;
	},

	S: function(){
		// summary: English ordinal suffix for the day of the month, 2 characters
		switch(this.date.getDate()){
			case 11: case 12: case 13: return "th";
			case 1: case 21: case 31: return "st";
			case 2: case 22: return "nd";
			case 3: case 23: return "rd";
			default: return "th";
		}
	},

	w: function(){
		// summary: Numeric representation of the day of the week
		return this.date.getDay() + "";
	},

	z: function(){
		// summary: The day of the year (starting from 0)
		var millis = this.date.getTime() - new Date(this.date.getFullYear(), 0, 1).getTime();
		return Math.floor(millis/86400000) + "";
	},

	// Week

	W: function(){
		// summary: ISO-8601 week number of year, weeks starting on Monday (added in PHP 4.1.0)
		var week;
		var jan1_w = new Date(this.date.getFullYear(), 0, 1).getDay() + 1;
		var w = this.date.getDay() + 1;
		var z = parseInt(this.z());

		if(z <= (8 - jan1_w) && jan1_w > 4){
			var last_year = new Date(this.date.getFullYear() - 1, this.date.getMonth(), this.date.getDate());
			if(jan1_w == 5 || (jan1_w == 6 && dojo.date.isLeapYear(last_year))){
				week = 53;
			}else{
				week = 52;
			}
		}else{
			var i;
			if(Boolean(this.L())){
				i = 366;
			}else{
				i = 365;
			}
			if((i - z) < (4 - w)){
				week = 1;
			}else{
				var j = z + (7 - w) + (jan1_w - 1);
				week = Math.ceil(j / 7);
				if(jan1_w > 4){
					--week;
				}
			}
		}
		
		return week;
	},

	// Month

	F: function(){
		// summary: A full textual representation of a month, such as January or March
		return this.months[this.date.getMonth()];
	},

	m: function(){
		// summary: Numeric representation of a month, with leading zeros
		var n = this.n();
		return (n.length == 1) ? "0" + n : n;
	},

	M: function(){
		// summary: A short textual representation of a month, three letters
		return this.months_3[this.date.getMonth()];
	},

	n: function(){
		// summary: Numeric representation of a month, without leading zeros
		return this.date.getMonth() + 1 + "";
	},

	t: function(){
		// summary: Number of days in the given month
		return (Boolean(this.L()) && this.date.getMonth() == 1) ? 29 : this.monthdays[this.getMonth()];
	},

	// Year

	L: function(){
		// summary: Whether it's a leap year
		return (dojo.date.isLeapYear(this.date)) ? "1" : "0";
	},

	o: function(){
		// summary:
		//		ISO-8601 year number. This has the same value as Y, except that if
		//		the ISO week number (W) belongs to the previous or next year, that year is used instead. (added in PHP 5.1.0)
		// TODO: Figure out what this means
	},

	Y: function(){
		// summary: A full numeric representation of a year, 4 digits
		return this.date.getFullYear() + "";
	},

	y: function(){
		// summary: A two digit representation of a year
		return this.Y().slice(-2);
	},

	// Time

	a: function(){
		// summary: Lowercase Ante meridiem and Post meridiem
		return this.date.getHours() >= 12 ? "pm" : "am";
	},

	b: function(){
		// summary: Uppercase Ante meridiem and Post meridiem
		return this.a().toUpperCase();
	},

	B: function(){
		// summary:
		//	Swatch Internet time
		//	A day is 1,000 beats. All time is measured from GMT + 1
		var off = this.date.getTimezoneOffset() + 60;
		var secs = (this.date.getHours() * 3600) + (this.date.getMinutes() * 60) + this.getSeconds() + (off * 60);
		var beat = Math.abs(Math.floor(secs / 86.4) % 1000) + "";
		while(beat.length <  2) beat = "0" + beat;
		return beat;
	},

	g: function(){
		// summary: 12-hour format of an hour without leading zeros
		return (this.date.getHours() > 12) ? this.date.getHours() - 12 + "" : this.date.getHours() + "";
	},

	G: function(){
		// summary: 24-hour format of an hour without leading zeros
		return this.date.getHours() + "";
	},

	h: function(){
		// summary: 12-hour format of an hour with leading zeros
		var g = this.g();
		return (g.length == 1) ? "0" + g : g;
	},

	H: function(){
		// summary: 24-hour format of an hour with leading zeros
		var G = this.G();
		return (G.length == 1) ? "0" + G : G;
	},

	i: function(){
		// summary: Minutes with leading zeros
		var mins = this.date.getMinutes() + "";
		return (mins.length == 1) ? "0" + mins : mins;
	},

	s: function(){
		// summary: Seconds, with leading zeros
		var secs = this.date.getSeconds() + "";
		return (secs.length == 1) ? "0" + secs : secs;
	},

	// Timezone

	e: function(){
		// summary: Timezone identifier (added in PHP 5.1.0)
		return dojo.date.getTimezoneName(this.date);
	},

	I: function(){
		// summary: Whether or not the date is in daylight saving time
		// TODO: Can dojo.date do this?
	},

	O: function(){
		// summary: Difference to Greenwich time (GMT) in hours
		var off = Math.abs(this.date.getTimezoneOffset());
		var hours = Math.floor(off / 60) + "";
		var mins = (off % 60) + "";
		if(hours.length == 1) hours = "0" + hours;
		if(mins.length == 1) hours = "0" + mins;
		return ((this.date.getTimezoneOffset() < 0) ? "+" : "-") + hours + mins;
	},

	P: function(){
		// summary: Difference to Greenwich time (GMT) with colon between hours and minutes (added in PHP 5.1.3)
		var O = this.O();
		return O.substring(0, 2) + ":" + O.substring(2, 4);
	},

	T: function(){
		// summary: Timezone abbreviation

		// Guess...
		return this.e().substring(0, 3);
	},

	Z: function(){
		// summary:
		//		Timezone offset in seconds. The offset for timezones west of UTC is always negative,
		//		and for those east of UTC is always positive.
		return this.date.getTimezoneOffset() * -60;
	},

	// Full Date/Time

	c: function(){
		// summary: ISO 8601 date (added in PHP 5)
		return this.Y() + "-" + this.m() + "-" + this.d() + "T" + this.h() + ":" + this.i() + ":" + this.s() + this.P();
	},

	r: function(){
		// summary: RFC 2822 formatted date
		return this.D() + ", " + this.d() + " " + this.M() + " " + this.Y() + " " + this.H() + ":" + this.i() + ":" + this.s() + " " + this.O();
	},

	U: function(){
		// summary: Seconds since the Unix Epoch (January 1 1970 00:00:00 GMT)
		return Math.floor(this.date.getTime() / 1000);
	}

});

}

if(!dojo._hasResource["dojox.dtl.utils.date"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.utils.date"] = true;
dojo.provide("dojox.dtl.utils.date");



dojox.dtl.utils.date.DateFormat = function(/*String*/ format){
	dojox.date.php.DateFormat.call(this, format);
}
dojo.extend(dojox.dtl.utils.date.DateFormat, dojox.date.php.DateFormat.prototype, {
	f: function(){
		// summary:
		//		Time, in 12-hour hours and minutes, with minutes left off if they're zero.
		// description:
		//		Examples: '1', '1:30', '2:05', '2'
		//		Proprietary extension.
		return (!this.date.getMinutes()) ? this.g() : this.g() + ":" + this.i();
	},
	N: function(){
		// summary: Month abbreviation in Associated Press style. Proprietary extension.
		return dojox.dtl.utils.date._months_ap[this.date.getMonth()];
	},
	P: function(){
		// summary:
		//		Time, in 12-hour hours, minutes and 'a.m.'/'p.m.', with minutes left off
		//		if they're zero and the strings 'midnight' and 'noon' if appropriate.
		// description:
		//		Examples: '1 a.m.', '1:30 p.m.', 'midnight', 'noon', '12:30 p.m.'
		//		Proprietary extension.
		if(!this.date.getMinutes() && !this.date.getHours()){
			return 'midnight';
		}
		if(!this.date.getMinutes() && this.date.getHours() == 12){
			return 'noon';
		}
		return this.f() + " " + this.a();
	}
});

dojo.mixin(dojox.dtl.utils.date, {
	format: function(/*Date*/ date, /*String*/ format){
		var df = new dojox.dtl.utils.date.DateFormat(format);
		return df.format(date);
	},
	timesince: function(d, now){
		// summary:
		//		Takes two datetime objects and returns the time between then and now
		//		as a nicely formatted string, e.g "10 minutes"
		// description:
		//		Adapted from http://blog.natbat.co.uk/archive/2003/Jun/14/time_since
		if(!(d instanceof Date)){
			d = new Date(d.year, d.month, d.day);
		}
		if(!now){
			now = new Date();
		}

		var delta = Math.abs(now.getTime() - d.getTime());
		for(var i = 0, chunk; chunk = dojox.dtl.utils.date._chunks[i]; i++){
			var count = Math.floor(delta / chunk[0]);
			if(count) break;
		}
		return count + " " + chunk[1](count);
	},
	_chunks: [
		[60 * 60 * 24 * 365 * 1000, function(n){ return (n == 1) ? 'year' : 'years'; }],
		[60 * 60 * 24 * 30 * 1000, function(n){ return (n == 1) ? 'month' : 'months'; }],
		[60 * 60 * 24 * 7 * 1000, function(n){ return (n == 1) ? 'week' : 'weeks'; }],
		[60 * 60 * 24 * 1000, function(n){ return (n == 1) ? 'day' : 'days'; }],
		[60 * 60 * 1000, function(n){ return (n == 1) ? 'hour' : 'hours'; }],
		[60 * 1000, function(n){ return (n == 1) ? 'minute' : 'minutes'; }]
	],
	_months_ap: ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."]
});

}

if(!dojo._hasResource["dojox.dtl.tag.date"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.tag.date"] = true;
dojo.provide("dojox.dtl.tag.date");




dojox.dtl.tag.date.NowNode = function(format, node){
	this._format = format;
	this.format = new dojox.dtl.utils.date.DateFormat(format);
	this.contents = node;
}
dojo.extend(dojox.dtl.tag.date.NowNode, {
	render: function(context, buffer){
		this.contents.set(this.format.format(new Date()));
		return this.contents.render(context, buffer);
	},
	unrender: function(context, buffer){
		return this.contents.unrender(context, buffer);
	},
	clone: function(buffer){
		return new this.constructor(this._format, this.contents.clone(buffer));
	}
});

dojox.dtl.tag.date.now = function(parser, token){
	// Split by either :" or :'
	var parts = token.split_contents();
	if(parts.length != 2){
		throw new Error("'now' statement takes one argument");
	}
	return new dojox.dtl.tag.date.NowNode(parts[1].slice(1, -1), parser.create_text_node());
}

}

if(!dojo._hasResource["dojox.dtl.tag.loader"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.tag.loader"] = true;
dojo.provide("dojox.dtl.tag.loader");



(function(){
	var dd = dojox.dtl;
	var ddtl = dd.tag.loader;

	ddtl.BlockNode = dojo.extend(function(name, nodelist){
		this.name = name;
		this.nodelist = nodelist; // Can be overridden
	},
	{
		"super": function(){
			if(this.parent){
				var html = this.parent.nodelist.dummyRender(this.context, null, true);
				if(typeof html == "string"){
					html = new String(html);
				}
				html.safe = true;
				return html;
			}
			return '';
		},
		render: function(context, buffer){
			var name = this.name;
			var nodelist = this.nodelist;
			var parent;
			if(buffer.blocks){
				var block = buffer.blocks[name];
				if(block){
					parent = block.parent;
					nodelist = block.nodelist;
					block.used = true;
				}
			}

			this.rendered = nodelist;

			context = context.push();
			this.context = context;
			this.parent = null;
			if(nodelist != this.nodelist){
				this.parent = this;
			}
			context.block = this;

			if(buffer.getParent){
				var bufferParent = buffer.getParent();
				var setParent = dojo.connect(buffer, "onSetParent", function(node, up, root){
					if(up && root){
						buffer.setParent(bufferParent);
					}
				});
			}
			buffer = nodelist.render(context, buffer, this);
			setParent && dojo.disconnect(setParent);
			context = context.pop();
			return buffer;
		},
		unrender: function(context, buffer){
			return this.rendered.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.name, this.nodelist.clone(buffer));
		},
		toString: function(){ return "dojox.dtl.tag.loader.BlockNode"; }
	});

	ddtl.ExtendsNode = dojo.extend(function(getTemplate, nodelist, shared, parent, key){
		this.getTemplate = getTemplate;
		this.nodelist = nodelist;
		this.shared = shared;
		this.parent = parent;
		this.key = key;
	},
	{
		parents: {},
		getParent: function(context){
			var parent = this.parent;
			if(!parent){
				var string;
				parent = this.parent = context.get(this.key, false);
				if(!parent){
					throw new Error("extends tag used a variable that did not resolve");
				}
				if(typeof parent == "object"){
					var url = parent.url || parent.templatePath;
					if(parent.shared){
						this.shared = true;
					}
					if(url){
						parent = this.parent = url.toString();
					}else if(parent.templateString){
						// Allow the builder's string interning to work
						string = parent.templateString;
						parent = this.parent = " ";
					}else{
						parent = this.parent = this.parent.toString();
					}
				}
				if(parent && parent.indexOf("shared:") === 0){
					this.shared = true;
					parent = this.parent = parent.substring(7, parent.length);
				}
			}
			if(!parent){
				throw new Error("Invalid template name in 'extends' tag.");
			}
			if(parent.render){
				return parent;
			}
			if(this.parents[parent]){
				return this.parents[parent];
			}
			this.parent = this.getTemplate(string || dojox.dtl.text.getTemplateString(parent));
			if(this.shared){
				this.parents[parent] = this.parent;
			}
			return this.parent;
		},
		render: function(context, buffer){
			var parent = this.getParent(context);

			parent.blocks = parent.blocks || {};
			buffer.blocks = buffer.blocks || {};

			for(var i = 0, node; node = this.nodelist.contents[i]; i++){
				if(node instanceof dojox.dtl.tag.loader.BlockNode){
					var old = parent.blocks[node.name];
					if(old && old.nodelist != node.nodelist){
						// In a shared template, the individual blocks might change
						buffer = old.nodelist.unrender(context, buffer);
					}
					parent.blocks[node.name] = buffer.blocks[node.name] = {
						shared: this.shared,
						nodelist: node.nodelist,
						used: false
					}
				}
			}

			this.rendered = parent;
			return parent.nodelist.render(context, buffer, this);
		},
		unrender: function(context, buffer){
			return this.rendered.unrender(context, buffer, this);
		},
		toString: function(){ return "dojox.dtl.block.ExtendsNode"; }
	});

	ddtl.IncludeNode = dojo.extend(function(path, constant, getTemplate, text, parsed){
		this._path = path;
		this.constant = constant;
		this.path = (constant) ? path : new dd._Filter(path);
		this.getTemplate = getTemplate;
		this.text = text;
		this.parsed = (arguments.length == 5) ? parsed : true;
	},
	{
		_cache: [{}, {}],
		render: function(context, buffer){
			var location = ((this.constant) ? this.path : this.path.resolve(context)).toString();
			var parsed = Number(this.parsed);
			var dirty = false;
			if(location != this.last){
				dirty = true;
				if(this.last){
					buffer = this.unrender(context, buffer);
				}
				this.last = location;
			}

			var cache = this._cache[parsed];

			if(parsed){
				if(!cache[location]){
					cache[location] = dd.text._resolveTemplateArg(location, true);
				}
				if(dirty){
					var template = this.getTemplate(cache[location]);
					this.rendered = template.nodelist;
				}
				return this.rendered.render(context, buffer, this);
			}else{
				if(this.text instanceof dd._TextNode){
					if(dirty){
						this.rendered = this.text;
						this.rendered.set(dd.text._resolveTemplateArg(location, true));
					}
					return this.rendered.render(context, buffer);
				}else{
					if(!cache[location]){
						var nodelist = [];
						var div = document.createElement("div");
						div.innerHTML = dd.text._resolveTemplateArg(location, true);
						var children = div.childNodes;
						while(children.length){
							var removed = div.removeChild(children[0]);
							nodelist.push(removed);
						}
						cache[location] = nodelist;
					}
					if(dirty){
						this.nodelist = [];
						var exists = true;
						for(var i = 0, child; child = cache[location][i]; i++){
							this.nodelist.push(child.cloneNode(true));
						}
					}
					for(var i = 0, node; node = this.nodelist[i]; i++){
						buffer = buffer.concat(node);
					}
				}
			}
			return buffer;
		},
		unrender: function(context, buffer){
			if(this.rendered){
				buffer = this.rendered.unrender(context, buffer);
			}
			if(this.nodelist){
				for(var i = 0, node; node = this.nodelist[i]; i++){
					buffer = buffer.remove(node);
				}
			}
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this._path, this.constant, this.getTemplate, this.text.clone(buffer), this.parsed);
		}
	});

	dojo.mixin(ddtl, {
		block: function(parser, token){
			var parts = token.contents.split();
			var name = parts[1];

			parser._blocks = parser._blocks || {};
			parser._blocks[name] = parser._blocks[name] || [];
			parser._blocks[name].push(name);

			var nodelist = parser.parse(["endblock", "endblock " + name]).rtrim();
			parser.next_token();
			return new dojox.dtl.tag.loader.BlockNode(name, nodelist);
		},
		extends_: function(parser, token){
			var parts = token.contents.split();
			var shared = false;
			var parent = null;
			var key = null;
			if(parts[1].charAt(0) == '"' || parts[1].charAt(0) == "'"){
				parent = parts[1].substring(1, parts[1].length - 1);
			}else{
				key = parts[1];
			}
			if(parent && parent.indexOf("shared:") == 0){
				shared = true;
				parent = parent.substring(7, parent.length);
			}
			var nodelist = parser.parse();
			return new dojox.dtl.tag.loader.ExtendsNode(parser.getTemplate, nodelist, shared, parent, key);
		},
		include: function(parser, token){
			var parts = token.contents.split();
			if(parts.length != 2){
				throw new Error(parts[0] + " tag takes one argument: the name of the template to be included");
			}
			var path = parts[1];
			var constant = false;
			if((path.charAt(0) == '"' || path.slice(-1) == "'") && path.charAt(0) == path.slice(-1)){
				path = path.slice(1, -1);
				constant = true;
			}
			return new ddtl.IncludeNode(path, constant, parser.getTemplate, parser.create_text_node());
		},
		ssi: function(parser, token){
			// We're going to treat things a little differently here.
			// First of all, this tag is *not* portable, so I'm not
			// concerned about it being a "drop in" replacement.

			// Instead, we'll just replicate the include tag, but with that
			// optional "parsed" parameter.
			var parts = token.contents.split();
			var parsed = false;
			if(parts.length == 3){
				parsed = (parts.pop() == "parsed");
				if(!parsed){
					throw new Error("Second (optional) argument to ssi tag must be 'parsed'");
				}
			}
			var node = ddtl.include(parser, new dd.Token(token.token_type, parts.join(" ")));
			node.parsed = parsed;
			return node;
		}
	});
})();

}

if(!dojo._hasResource["dojox.dtl.tag.misc"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.tag.misc"] = true;
dojo.provide("dojox.dtl.tag.misc");


(function(){
	var dd = dojox.dtl;
	var ddtm = dd.tag.misc;

	ddtm.DebugNode = dojo.extend(function(text){
		this.text = text;
	},
	{
		render: function(context, buffer){
			var keys = context.getKeys();
			var debug = [];
			var only = {};
			for(var i = 0, key; key = keys[i]; i++){
				only[key] = context[key];
				debug += "[" + key + ": " + typeof context[key] + "]\n";
			}
			console.debug(only);
			return this.text.set(debug).render(context, buffer, this);
		},
		unrender: function(context, buffer){
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this.text.clone(buffer));
		},
		toString: function(){ return "ddtm.DebugNode"; }
	});

	ddtm.FilterNode = dojo.extend(function(varnode, nodelist){
		this._varnode = varnode;
		this._nodelist = nodelist;
	},
	{
		render: function(context, buffer){
			// Doing this in HTML requires a different buffer with a fake root node
			var output = this._nodelist.render(context, new dojox.string.Builder());
			context = context.update({ "var": output.toString() });
			var filtered = this._varnode.render(context, buffer);
			context = context.pop();
			return buffer;
		},
		unrender: function(context, buffer){
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this._expression, this._nodelist.clone(buffer));
		}
	});

	ddtm.FirstOfNode = dojo.extend(function(vars, text){
		this._vars = vars;
		this.vars = dojo.map(vars, function(item){
			return new dojox.dtl._Filter(item);
		});
		this.contents = text;
	},
	{
		render: function(context, buffer){
			for(var i = 0, item; item = this.vars[i]; i++){
				var resolved = item.resolve(context);
				if(typeof resolved != "undefined"){
					if(resolved === null){
						resolved = "null";
					}
					this.contents.set(resolved);
					return this.contents.render(context, buffer);
				}
			}
			return this.contents.unrender(context, buffer);
		},
		unrender: function(context, buffer){
			return this.contents.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this._vars, this.contents.clone(buffer));
		}
	});

	ddtm.SpacelessNode = dojo.extend(function(nodelist, text){
		this.nodelist = nodelist;
		this.contents = text;
	},
	{
		render: function(context, buffer){
			if(buffer.getParent){
				// Unfortunately, we have to branch here
				var watch = [
					dojo.connect(buffer, "onAddNodeComplete", this, "_watch"),
					dojo.connect(buffer, "onSetParent", this, "_watchParent")
				];
				buffer = this.nodelist.render(context, buffer);
				dojo.disconnect(watch[0]);
				dojo.disconnect(watch[1]);
			}else{
				var value = this.nodelist.dummyRender(context);
				this.contents.set(value.replace(/>\s+</g, '><'));
				buffer = this.contents.render(context, buffer);
			}
			return buffer;
		},
		unrender: function(context, buffer){
			return this.nodelist.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.nodelist.clone(buffer), this.contents.clone(buffer));
		},
		_isEmpty: function(node){
			return (node.nodeType == 3 && !node.data.match(/[^\s\n]/));
		},
		_watch: function(node){
			if(this._isEmpty(node)){
				var remove = false;
				if(node.parentNode.firstChild == node){
					node.parentNode.removeChild(node);
				}
			}else{
				var children = node.parentNode.childNodes;
				if(node.nodeType == 1 && children.length > 2){
					for(var i = 2, child; child = children[i]; i++){
						if(children[i - 2].nodeType == 1 && this._isEmpty(children[i - 1])){
							node.parentNode.removeChild(children[i - 1]);
							return;
						}
					}
				}
			}
		},
		_watchParent: function(node){
			var children = node.childNodes;
			if(children.length){
				while(node.childNodes.length){
					var last = node.childNodes[node.childNodes.length - 1];
					if(!this._isEmpty(last)){
						return;
					}
					node.removeChild(last);
				}
			}
		}
	});

	ddtm.TemplateTagNode = dojo.extend(function(tag, text){
		this.tag = tag;
		this.contents = text;
	},
	{
		mapping: {
			openblock: "{%",
			closeblock: "%}",
			openvariable: "{{",
			closevariable: "}}",
			openbrace: "{",
			closebrace: "}",
			opencomment: "{#",
			closecomment: "#}"
		},
		render: function(context, buffer){
			this.contents.set(this.mapping[this.tag]);
			return this.contents.render(context, buffer);
		},
		unrender: function(context, buffer){
			return this.contents.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.tag, this.contents.clone(buffer));
		}
	});

	ddtm.WidthRatioNode = dojo.extend(function(current, max, width, text){
		this.current = new dd._Filter(current);
		this.max = new dd._Filter(max);
		this.width = width;
		this.contents = text;
	},
	{
		render: function(context, buffer){
			var current = +this.current.resolve(context);
			var max = +this.max.resolve(context);
			if(typeof current != "number" || typeof max != "number" || !max){
				this.contents.set("");
			}else{
				this.contents.set("" + Math.round((current / max) * this.width));
			}
			return this.contents.render(context, buffer);
		},
		unrender: function(context, buffer){
			return this.contents.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.current.getExpression(), this.max.getExpression(), this.width, this.contents.clone(buffer));
		}
	});

	ddtm.WithNode = dojo.extend(function(target, alias, nodelist){
		this.target = new dd._Filter(target);
		this.alias = alias;
		this.nodelist = nodelist;
	},
	{
		render: function(context, buffer){
			var target = this.target.resolve(context);
			context = context.push();
			context[this.alias] = target;
			buffer = this.nodelist.render(context, buffer);
			context = context.pop();
			return buffer;
		},
		unrender: function(context, buffer){
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this.target.getExpression(), this.alias, this.nodelist.clone(buffer));
		}
	});

	dojo.mixin(ddtm, {
		comment: function(parser, token){
			// summary: Ignore everything between {% comment %} and {% endcomment %}
			parser.skip_past("endcomment");
			return dd._noOpNode;
		},
		debug: function(parser, token){
			// summary: Output the current context, maybe add more stuff later.
			return new ddtm.DebugNode(parser.create_text_node());
		},
		filter: function(parser, token){
			// summary: Filter the contents of the blog through variable filters.
			var rest = token.contents.split(null, 1)[1];
			var varnode = parser.create_variable_node("var|" + rest);
			var nodelist = parser.parse(["endfilter"]);
			parser.next_token();
			return new ddtm.FilterNode(varnode, nodelist);
		},
		firstof: function(parser, token){
			var parts = token.split_contents().slice(1);
			if(!parts.length){
				throw new Error("'firstof' statement requires at least one argument");
			}
			return new ddtm.FirstOfNode(parts, parser.create_text_node());
		},
		spaceless: function(parser, token){
			var nodelist = parser.parse(["endspaceless"]);
			parser.delete_first_token();
			return new ddtm.SpacelessNode(nodelist, parser.create_text_node());
		},
		templatetag: function(parser, token){
			var parts = token.contents.split();
			if(parts.length != 2){
				throw new Error("'templatetag' statement takes one argument");
			}
			var tag = parts[1];
			var mapping = ddtm.TemplateTagNode.prototype.mapping;
			if(!mapping[tag]){
				var keys = [];
				for(var key in mapping){
					keys.push(key);
				}
				throw new Error("Invalid templatetag argument: '" + tag + "'. Must be one of: " + keys.join(", "));
			}
			return new ddtm.TemplateTagNode(tag, parser.create_text_node());
		},
		widthratio: function(parser, token){
			var parts = token.contents.split();
			if(parts.length != 4){
				throw new Error("widthratio takes three arguments");
			}
			var width = +parts[3];
			if(typeof width != "number"){
				throw new Error("widthratio final argument must be an integer");
			}
			return new ddtm.WidthRatioNode(parts[1], parts[2], width, parser.create_text_node());
		},
		with_: function(parser, token){
			var parts = token.split_contents();
			if(parts.length != 4 || parts[2] != "as"){
				throw new Error("do_width expected format as 'with value as name'");
			}
			var nodelist = parser.parse(["endwith"]);
			parser.next_token();
			return new ddtm.WithNode(parts[1], parts[3], nodelist);
		}
	});
})();

}

if(!dojo._hasResource["dojox.dtl.ext-dojo.NodeList"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.ext-dojo.NodeList"] = true;
dojo.provide("dojox.dtl.ext-dojo.NodeList");


dojo.extend(dojo.NodeList, {
	dtl: function(template, context){
		// template: dojox.dtl.__StringArgs|String
		//		The template string or location
		// context: dojox.dtl.__ObjectArgs|Object
		//		The context object or location
		var d = dojox.dtl;

		var self = this;
		var render = function(template, context){
			var content = template.render(new d._Context(context));
			self.forEach(function(node){
				node.innerHTML = content;
			});
		}

		d.text._resolveTemplateArg(template).addCallback(function(templateString){
			template = new d.Template(templateString);
			d.text._resolveContextArg(context).addCallback(function(context){
				render(template, context);
			});
		});

		return this;
	}
});

}

