define([
	"dojo/_base/lang",
	"./_base",
	"dojox/string/tokenize",
	"./Context",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/_base/html",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/sniff"
], function(lang,dd,Tokenize,context,dom,domconstruct,html,array,connect,has){

	dd.BOOLS = {checked: 1, disabled: 1, readonly: 1};
	dd.TOKEN_CHANGE = -11;
	dd.TOKEN_ATTR = -12;
	dd.TOKEN_CUSTOM = -13;
	dd.TOKEN_NODE = 1;

	var ddt = dd.text;
	var ddh = dd.dom = {
		_attributes: {},
		_uppers: {},
		_re4: /^function anonymous\(\)\s*{\s*(.*)\s*}$/,
		_reTrim: /(?:^[\n\s]*(\{%)?\s*|\s*(%\})?[\n\s]*$)/g,
		_reSplit: /\s*%\}[\n\s]*\{%\s*/g,
		getTemplate: function(text){
			if(typeof this._commentable == "undefined"){
				// Check to see if the browser can handle comments
				this._commentable = false;
				var div = document.createElement("div"), comment = "Test comment handling, and long comments, using comments whenever possible.";
				div.innerHTML = "<!--" + comment + "-->";
				if(div.childNodes.length && div.firstChild.nodeType == 8 && div.firstChild.data == comment){
					this._commentable = true;
				}
			}

			if(!this._commentable){
				// Strip comments
				text = text.replace(/<!--({({|%).*?(%|})})-->/g, "$1");
			}

			if(has("ie")){
				text = text.replace(/\b(checked|disabled|readonly|style)="/g, 't$1="');
			}
			text = text.replace(/\bstyle="/g, 'tstyle="');

			var match;
			var table = has("webkit");
			var pairs = [ // Format: [enable, parent, allowed children (first for nesting), nestings]
				[true, "select", "option"],
				[table, "tr", "td|th"],
				[table, "thead", "tr", "th"],
				[table, "tbody", "tr", "td"],
				[table, "table", "tbody|thead|tr", "tr", "td"]
			];
			var replacements = [];
			// Some tags can't contain text. So we wrap the text in tags that they can have.
			for(var i = 0, pair; pair = pairs[i]; i++){
				if(!pair[0]){
					continue;
				}
				if(text.indexOf("<" + pair[1]) != -1){
					var selectRe = new RegExp("<" + pair[1] + "(?:.|\n)*?>((?:.|\n)+?)</" + pair[1] + ">", "ig");
					tagLoop: while(match = selectRe.exec(text)){
						// Do it like this to make sure we don't double-wrap
						var inners = pair[2].split("|");
						var innerRe = [];
						for(var j = 0, inner; inner = inners[j]; j++){
							innerRe.push("<" + inner + "(?:.|\n)*?>(?:.|\n)*?</" + inner + ">");
						}
						var tags = [];
						var tokens = Tokenize(match[1], new RegExp("(" + innerRe.join("|") + ")", "ig"), function(data){
							var tag = /<(\w+)/.exec(data)[1];
							if(!tags[tag]){
								tags[tag] = true;
								tags.push(tag);
							}
							return {data: data};
						});
						if(tags.length){
							var tag = (tags.length == 1) ? tags[0] : pair[2].split("|")[0];

							var replace = [];
							for(var j = 0, jl = tokens.length; j < jl; j++) {
								var token = tokens[j];
								if(lang.isObject(token)){
									replace.push(token.data);
								}else{
									var stripped = token.replace(this._reTrim, "");
									if(!stripped){ continue; }
									token = stripped.split(this._reSplit);
									for(var k = 0, kl = token.length; k < kl; k++){
										var replacement = "";
										for(var p = 2, pl = pair.length; p < pl; p++){
											if(p == 2){
												replacement += "<" + tag + ' dtlinstruction="{% ' + token[k].replace('"', '\\"') + ' %}">';
											}else if(tag == pair[p]) {
												continue;
											}else{
												replacement += "<" + pair[p] + ">";
											}
										}
										replacement += "DTL";
										for(var p = pair.length - 1; p > 1; p--){
											if(p == 2){
												replacement += "</" + tag + ">";
											}else if(tag == pair[p]) {
												continue;
											}else{
												replacement += "</" + pair[p] + ">";
											}
										}
										replace.push("\xFF" + replacements.length);
										replacements.push(replacement);
									}
								}
							}
							text = text.replace(match[1], replace.join(""));
						}
					}
				}
			}

			for(var i = replacements.length; i--;){
				text = text.replace("\xFF" + i, replacements[i]);
			}

			var re = /\b([a-zA-Z_:][a-zA-Z0-9_\-\.:]*)=['"]/g;
			while(match = re.exec(text)){
				var lower = match[1].toLowerCase();
				if(lower == "dtlinstruction"){ continue; }
				if(lower != match[1]){
					this._uppers[lower] = match[1];
				}
				this._attributes[lower] = true;
			}
			var div = document.createElement("div");
			div.innerHTML = text;
			var output = {nodes: []};
			while(div.childNodes.length){
				output.nodes.push(div.removeChild(div.childNodes[0]))
			}

			return output;
		},
		tokenize: function(/*Node*/ nodes){
			var tokens = [];

			for(var i = 0, node; node = nodes[i++];){
				if(node.nodeType != 1){
					this.__tokenize(node, tokens);
				}else{
					this._tokenize(node, tokens);
				}
			}

			return tokens;
		},
		_swallowed: [],
		_tokenize: function(/*Node*/ node, /*Array*/ tokens){
			var first = false;
			var swallowed = this._swallowed;
			var i, j, tag, child;

			if(!tokens.first){
				// Try to efficiently associate tags that use an attribute to
				// remove the node from DOM (eg dojoType) so that we can efficiently
				// locate them later in the tokenizing.
				first = tokens.first = true;
				var tags = dd.register.getAttributeTags();
				for(i = 0; tag = tags[i]; i++){
					try{
						(tag[2])({ swallowNode: function(){ throw 1; }}, new dd.Token(dd.TOKEN_ATTR, ""));
					}catch(e){
						swallowed.push(tag);
					}
				}
			}

			for(i = 0; tag = swallowed[i]; i++){
				var text = node.getAttribute(tag[0]);
				if(text){
					var swallowed = false;
					var custom = (tag[2])({ swallowNode: function(){ swallowed = true; return node; }}, new dd.Token(dd.TOKEN_ATTR, tag[0] + " " + text));
					if(swallowed){
						if(node.parentNode && node.parentNode.removeChild){
							node.parentNode.removeChild(node);
						}
						tokens.push([dd.TOKEN_CUSTOM, custom]);
						return;
					}
				}
			}

			var children = [];
			if(has("ie") && node.tagName == "SCRIPT"){
				children.push({
					nodeType: 3,
					data: node.text
				});
				node.text = "";
			}else{
				for(i = 0; child = node.childNodes[i]; i++){
					children.push(child);
				}
			}

			tokens.push([dd.TOKEN_NODE, node]);

			var change = false;
			if(children.length){
				// Only do a change request if we need to
				tokens.push([dd.TOKEN_CHANGE, node]);
				change = true;
			}

			for(var key in this._attributes){
				var clear = false;

				var value = "";
				if(key == "class"){
					value = node.className || value;
				}else if(key == "for"){
					value = node.htmlFor || value;
				}else if(key == "value" && node.value == node.innerHTML){
					// Sometimes .value is set the same as the contents of the item (button)
					continue;
				}else if(node.getAttribute){
					value = node.getAttribute(key, 2) || value;
					if(key == "href" || key == "src"){
						if(has("ie")){
							var hash = location.href.lastIndexOf(location.hash);
							var href = location.href.substring(0, hash).split("/");
							href.pop();
							href = href.join("/") + "/";
							if(value.indexOf(href) == 0){
								value = value.replace(href, "");
							}
							value = decodeURIComponent(value);
						}
					}else if(key == "tstyle"){
						clear = key; // Placeholder because we can't use style
						key = "style";
					}else if(dd.BOOLS[key.slice(1)] && lang.trim(value)){
						key = key.slice(1);
					}else if(this._uppers[key] && lang.trim(value)){
						clear = this._uppers[key]; // Replaced by lowercase
					}
				}

				if(clear){
					// Clear out values that are different than will
					// be used in plugins
					node.setAttribute(clear, "");
					node.removeAttribute(clear);
				}

				if(typeof value == "function"){
					value = value.toString().replace(this._re4, "$1");
				}

				if(!change){
					// Only do a change request if we need to
					tokens.push([dd.TOKEN_CHANGE, node]);
					change = true;
				}

				// We'll have to resolve attributes during parsing (some ref plugins)

				tokens.push([dd.TOKEN_ATTR, node, key, value]);
			}

			for(i = 0, child; child = children[i]; i++){
				if(child.nodeType == 1){
					var instruction = child.getAttribute("dtlinstruction");
					if(instruction){
						child.parentNode.removeChild(child);
						child = {
							nodeType: 8,
							data: instruction
						};
					}
				}
				this.__tokenize(child, tokens);
			}

			if(!first && node.parentNode && node.parentNode.tagName){
				if(change){
					tokens.push([dd.TOKEN_CHANGE, node, true]);
				}
				tokens.push([dd.TOKEN_CHANGE, node.parentNode]);
				node.parentNode.removeChild(node);
			}else{
				// If this node is parentless, it's a base node, so we have to "up" change to itself
				// and note that it's a top-level to watch for errors
				tokens.push([dd.TOKEN_CHANGE, node, true, true]);
			}
		},
		__tokenize: function(child, tokens){
			var data = child.data;
			switch(child.nodeType){
				case 1:
					this._tokenize(child, tokens);
					return;
				case 3:
					if(data.match(/[^\s\n]/) && (data.indexOf("{{") != -1 || data.indexOf("{%") != -1)){
						var texts = ddt.tokenize(data);
						for(var j = 0, text; text = texts[j]; j++){
							if(typeof text == "string"){
								tokens.push([dd.TOKEN_TEXT, text]);
							}else{
								tokens.push(text);
							}
						}
					}else{
						tokens.push([child.nodeType, child]);
					}
					if(child.parentNode) child.parentNode.removeChild(child);
					return;
				case 8:
					if(data.indexOf("{%") == 0){
						var text = lang.trim(data.slice(2, -2));
						if(text.substr(0, 5) == "load "){
							var parts = lang.trim(text).split(/\s+/g);
							for(var i = 1, part; part = parts[i]; i++){
								if (/\./.test(part)){
									part = part.replace(/\./g,"/");
								}
								require([part]);
							}
						}
						tokens.push([dd.TOKEN_BLOCK, text]);
					}
					if(data.indexOf("{{") == 0){
						tokens.push([dd.TOKEN_VAR, lang.trim(data.slice(2, -2))]);
					}
					if(child.parentNode) child.parentNode.removeChild(child);
					return;
			}
		}
	};

	dd.DomTemplate = lang.extend(function(/*String|DOMNode|dojo/Url*/ obj){
		// summary:
		//		The template class for DOM templating.
		if(!obj.nodes){
			var node = dom.byId(obj);
			if(node && node.nodeType == 1){
				array.forEach(["class", "src", "href", "name", "value"], function(item){
					ddh._attributes[item] = true;
				});
				obj = {
					nodes: [node]
				};
			}else{
				if(typeof obj == "object"){
					obj = ddt.getTemplateString(obj);
				}
				obj = ddh.getTemplate(obj);
			}
		}

		var tokens = ddh.tokenize(obj.nodes);
		if(dd.tests){
			this.tokens = tokens.slice(0);
		}

		var parser = new dd._DomParser(tokens);
		this.nodelist = parser.parse();
	},
	{
		_count: 0,
		_re: /\bdojo:([a-zA-Z0-9_]+)\b/g,
		setClass: function(/*String*/str){
			// summary:
			//		Sets the specified class name on the root node.
			this.getRootNode().className = str;
		},
		getRootNode: function(){
			// summary:
			//		Returns the template root node.
			return this.buffer.rootNode;
		},
		getBuffer: function(){
			// summary:
			//		Returns a new buffer.
			return new dd.DomBuffer();
		},
		render: function(/*dojox/dtl/Context?*/context, /*concatenable?*/buffer){
			// summary:
			//		Renders this template.
			buffer = this.buffer = buffer || this.getBuffer();
			this.rootNode = null;
			var output = this.nodelist.render(context || new dd.Context({}), buffer);
			for(var i = 0, node; node = buffer._cache[i]; i++){
				if(node._cache){
					node._cache.length = 0;
				}
			}
			return output;
		},
		unrender: function(context, buffer){
			return this.nodelist.unrender(context, buffer);
		}
	});

	dd.DomBuffer = lang.extend(function(/*Node*/ parent){
		// summary:
		//		Allows the manipulation of DOM
		// description:
		//		Use this to append a child, change the parent, or
		//		change the attribute of the current node.
		// parent:
		//		The parent node.
		this._parent = parent;
		this._cache = [];
	},
	{
		concat: function(/*DOMNode*/ node){
			var parent = this._parent;
			if(parent && node.parentNode && node.parentNode === parent && !parent._dirty){
				return this;
			}

			if(node.nodeType == 1 && !this.rootNode){
				this.rootNode = node || true;
				return this;
			}

			if(!parent){
				if(node.nodeType == 3 && lang.trim(node.data)){
					throw new Error("Text should not exist outside of the root node in template");
				}
				return this;
			}
			if(this._closed){
				if(node.nodeType == 3 && !lang.trim(node.data)){
					return this;
				}else{
					throw new Error("Content should not exist outside of the root node in template");
				}
			}
			if(parent._dirty){
				if(node._drawn && node.parentNode == parent){
					var caches = parent._cache;
					if(caches){
						for(var i = 0, cache; cache = caches[i]; i++){
							this.onAddNode && this.onAddNode(cache);
							parent.insertBefore(cache, node);
							this.onAddNodeComplete && this.onAddNodeComplete(cache);
						}
						caches.length = 0;
					}
				}
				parent._dirty = false;
			}
			if(!parent._cache){
				parent._cache = [];
				this._cache.push(parent);
			}
			parent._dirty = true;
			parent._cache.push(node);
			return this;
		},
		remove: function(/*String|DomNode*/obj){
			if(typeof obj == "string"){
				if(this._parent){
					this._parent.removeAttribute(obj);
				}
			}else{
				if(obj.nodeType == 1 && !this.getRootNode() && !this._removed){
					this._removed = true;
					return this;
				}
				if(obj.parentNode){
					this.onRemoveNode && this.onRemoveNode(obj);
					if(obj.parentNode){
						obj.parentNode.removeChild(obj);
					}
				}
			}
			return this;
		},
		setAttribute: function(key, value){
			var old = html.attr(this._parent, key);
			if(this.onChangeAttribute && old != value){
				this.onChangeAttribute(this._parent, key, old, value);
			}
			if(key == "style"){
				//console.log(value);
				this._parent.style.cssText = value;
			}else{
				html.attr(this._parent, key, value);
				//console.log(this._parent, key, value);
				if(key == "value"){
					this._parent.setAttribute(key, value);
				}
			}
			return this;
		},
		addEvent: function(context, type, fn, /*Array|Function*/ args){
			if(!context.getThis()){ throw new Error("You must use Context.setObject(instance)"); }
			this.onAddEvent && this.onAddEvent(this.getParent(), type, fn);
			var resolved = fn;
			if(lang.isArray(args)){
				resolved = function(e){
					this[fn].apply(this, [e].concat(args));
				}
			}
			return connect.connect(this.getParent(), type, context.getThis(), resolved);
		},
		setParent: function(node, /*Boolean?*/ up, /*Boolean?*/ root){
			if(!this._parent) this._parent = this._first = node;

			if(up && root && node === this._first){
				this._closed = true;
			}

			if(up){
				var parent = this._parent;
				var script = "";
				var ie = has("ie") && parent.tagName == "SCRIPT";
				if(ie){
					parent.text = "";
				}
				if(parent._dirty){
					var caches = parent._cache;
					var select = (parent.tagName == "SELECT" && !parent.options.length);
					for(var i = 0, cache; cache = caches[i]; i++){
						if(cache !== parent){
							this.onAddNode && this.onAddNode(cache);
							if(ie){
								script += cache.data;
							}else{
								parent.appendChild(cache);
								if(select && cache.defaultSelected && i){
									select = i;
								}
							}
							this.onAddNodeComplete && this.onAddNodeComplete(cache);
						}
					}
					if(select){
						parent.options.selectedIndex = (typeof select == "number") ? select : 0;
					}
					caches.length = 0;
					parent._dirty = false;
				}
				if(ie){
					parent.text = script;
				}
			}

			this._parent = node;
			this.onSetParent && this.onSetParent(node, up, root);
			return this;
		},
		getParent: function(){
			return this._parent;
		},
		getRootNode: function(){
			return this.rootNode;
		}
		/*=====
		,
		onSetParent: function(node, up){
			// summary:
			//		Stub called when setParent is used.
		},
		onAddNode: function(node){
			// summary:
			//		Stub called before new nodes are added
		},
		onAddNodeComplete: function(node){
			// summary:
			//		Stub called after new nodes are added
		},
		onRemoveNode: function(node){
			// summary:
			//		Stub called when nodes are removed
		},
		onChangeAttribute: function(node, attribute, old, updated){
			// summary:
			//		Stub called when an attribute is changed
		},
		onChangeData: function(node, old, updated){
			// summary:
			//		Stub called when a data in a node is changed
		},
		onClone: function(from, to){
			// summary:
			//		Stub called when a node is duplicated
			// from: DOMNode
			// to: DOMNode
		},
		onAddEvent: function(node, type, description){
			// summary:
			//		Stub to call when you're adding an event
			// node: DOMNode
			// type: String
			// description: String
		}
		=====*/
	});

	dd._DomNode = lang.extend(function(node){
		// summary:
		//		Places a node into DOM
		this.contents = node;
	},
	{
		render: function(context, buffer){
			this._rendered = true;
			return buffer.concat(this.contents);
		},
		unrender: function(context, buffer){
			if(!this._rendered){
				return buffer;
			}
			this._rendered = false;
			return buffer.remove(this.contents);
		},
		clone: function(buffer){
			return new this.constructor(this.contents);
		}
	});

	dd._DomNodeList = lang.extend(function(/*Node[]*/ nodes){
		// summary:
		//		A list of any DOM-specific node objects
		// description:
		//		Any object that's used in the constructor or added
		//		through the push function much implement the
		//		render, unrender, and clone functions.
		this.contents = nodes || [];
	},
	{
		push: function(node){
			this.contents.push(node);
		},
		unshift: function(node){
			this.contents.unshift(node);
		},
		render: function(context, buffer, /*Node*/ instance){
			buffer = buffer || dd.DomTemplate.prototype.getBuffer();

			if(instance){
				var parent = buffer.getParent();
			}
			for(var i = 0; i < this.contents.length; i++){
				buffer = this.contents[i].render(context, buffer);
				if(!buffer) throw new Error("Template node render functions must return their buffer");
			}
			if(parent){
				buffer.setParent(parent);
			}
			return buffer;
		},
		dummyRender: function(context, buffer, asNode){
			// summary:
			//		A really expensive way of checking to see how a rendering will look.
			//		Used in the ifchanged tag
			var div = document.createElement("div");

			var parent = buffer.getParent();
			var old = parent._clone;
			// Tell the clone system to attach itself to our new div
			parent._clone = div;
			var nodelist = this.clone(buffer, div);
			if(old){
				// Restore state if there was a previous clone
				parent._clone = old;
			}else{
				// Remove if there was no clone
				parent._clone = null;
			}

			buffer = dd.DomTemplate.prototype.getBuffer();
			nodelist.unshift(new dd.ChangeNode(div));
			nodelist.unshift(new dd._DomNode(div));
			nodelist.push(new dd.ChangeNode(div, true));
			nodelist.render(context, buffer);

			if(asNode){
				return buffer.getRootNode();
			}

			var html = div.innerHTML;
			return (has("ie")) ? domconstruct.replace(/\s*_(dirty|clone)="[^"]*"/g, "") : html;
		},
		unrender: function(context, buffer, instance){
			if(instance){
				var parent = buffer.getParent();
			}
			for(var i = 0; i < this.contents.length; i++){
				buffer = this.contents[i].unrender(context, buffer);
				if(!buffer) throw new Error("Template node render functions must return their buffer");
			}
			if(parent){
				buffer.setParent(parent);
			}
			return buffer;
		},
		clone: function(buffer){
			// summary:
			//		Used to create an identical copy of a NodeList, useful for things like the for tag.
			var parent = buffer.getParent();
			var contents = this.contents;
			var nodelist = new dd._DomNodeList();
			var cloned = [];
			for(var i = 0; i < contents.length; i++){
				var clone = contents[i].clone(buffer);
				if(clone instanceof dd.ChangeNode || clone instanceof dd._DomNode){
					var item = clone.contents._clone;
					if(item){
						clone.contents = item;
					}else if(parent != clone.contents && clone instanceof dd._DomNode){
						var node = clone.contents;
						clone.contents = clone.contents.cloneNode(false);
						buffer.onClone && buffer.onClone(node, clone.contents);
						cloned.push(node);
						node._clone = clone.contents;
					}
				}
				nodelist.push(clone);
			}

			for(var i = 0, clone; clone = cloned[i]; i++){
				clone._clone = null;
			}

			return nodelist;
		},
		rtrim: function(){
			while(1){
				var i = this.contents.length - 1;
				if(this.contents[i] instanceof dd._DomTextNode && this.contents[i].isEmpty()){
					this.contents.pop();
				}else{
					break;
				}
			}

			return this;
		}
	});

	dd._DomVarNode = lang.extend(function(str){
		// summary:
		//		A node to be processed as a variable
		// description:
		//		Will render an object that supports the render function
		// 		and the getRootNode function
		this.contents = new dd._Filter(str);
	},
	{
		render: function(context, buffer){
			var str = this.contents.resolve(context);

			// What type of rendering?
			var type = "text";
			if(str){
				if(str.render && str.getRootNode){
					type = "injection";
				}else if(str.safe){
					if(str.nodeType){
						type = "node";
					}else if(str.toString){
						str = str.toString();
						type = "html";
					}
				}
			}

			// Has the typed changed?
			if(this._type && type != this._type){
				this.unrender(context, buffer);
			}
			this._type = type;

			// Now render
			switch(type){
			case "text":
				this._rendered = true;
				this._txt = this._txt || document.createTextNode(str);
				if(this._txt.data != str){
					var old = this._txt.data;
					this._txt.data = str;
					buffer.onChangeData && buffer.onChangeData(this._txt, old, this._txt.data);
				}
				return buffer.concat(this._txt);
			case "injection":
				var root = str.getRootNode();

				if(this._rendered && root != this._root){
					buffer = this.unrender(context, buffer);
				}
				this._root = root;

				var injected = this._injected = new dd._DomNodeList();
				injected.push(new dd.ChangeNode(buffer.getParent()));
				injected.push(new dd._DomNode(root));
				injected.push(str);
				injected.push(new dd.ChangeNode(buffer.getParent()));
				this._rendered = true;

				return injected.render(context, buffer);
			case "node":
				this._rendered = true;
				if(this._node && this._node != str && this._node.parentNode && this._node.parentNode === buffer.getParent()){
					this._node.parentNode.removeChild(this._node);
				}
				this._node = str;
				return buffer.concat(str);
			case "html":
				if(this._rendered && this._src != str){
					buffer = this.unrender(context, buffer);
				}
				this._src = str;

				// This can get reset in the above tag
				if(!this._rendered){
					this._rendered = true;
					this._html = this._html || [];
					var div = (this._div = this._div || document.createElement("div"));
					div.innerHTML = str;
					var children = div.childNodes;
					while(children.length){
						var removed = div.removeChild(children[0]);
						this._html.push(removed);
						buffer = buffer.concat(removed);
					}
				}

				return buffer;
			default:
				return buffer;
			}
		},
		unrender: function(context, buffer){
			if(!this._rendered){
				return buffer;
			}
			this._rendered = false;

			// Unrender injected nodes
			switch(this._type){
			case "text":
				return buffer.remove(this._txt);
			case "injection":
				return this._injection.unrender(context, buffer);
			case "node":
				if(this._node.parentNode === buffer.getParent()){
					return buffer.remove(this._node);
				}
				return buffer;
			case "html":
				for(var i = 0, l = this._html.length; i < l; i++){
					buffer = buffer.remove(this._html[i]);
				}
				return buffer;
			default:
				return buffer;
			}
		},
		clone: function(){
			return new this.constructor(this.contents.getExpression());
		}
	});

	dd.ChangeNode = lang.extend(function(node, /*Boolean?*/ up, /*Bookean*/ root){
		// summary:
		//		Changes the parent during render/unrender
		this.contents = node;
		this.up = up;
		this.root = root;
	},
	{
		render: function(context, buffer){
			return buffer.setParent(this.contents, this.up, this.root);
		},
		unrender: function(context, buffer){
			if(!buffer.getParent()){
				return buffer;
			}
			return buffer.setParent(this.contents);
		},
		clone: function(){
			return new this.constructor(this.contents, this.up, this.root);
		}
	});

	dd.AttributeNode = lang.extend(function(key, value){
		// summary
		//		Works on attributes
		this.key = key;
		this.value = value;
		this.contents = value;
		if(this._pool[value]){
			this.nodelist = this._pool[value];
		}else{
			if(!(this.nodelist = dd.quickFilter(value))){
				this.nodelist = (new dd.Template(value, true)).nodelist;
			}
			this._pool[value] = this.nodelist;
		}

		this.contents = "";
	},
	{
		_pool: {},
		render: function(context, buffer){
			var key = this.key;
			var value = this.nodelist.dummyRender(context);
			if(dd.BOOLS[key]){
				value = !(value == "false" || value == "undefined" || !value);
			}
			if(value !== this.contents){
				this.contents = value;
				return buffer.setAttribute(key, value);
			}
			return buffer;
		},
		unrender: function(context, buffer){
			this.contents = "";
			return buffer.remove(this.key);
		},
		clone: function(buffer){
			return new this.constructor(this.key, this.value);
		}
	});

	dd._DomTextNode = lang.extend(function(str){
		// summary
		//		Adds a straight text node without any processing
		this.contents = document.createTextNode(str);
		this.upcoming = str;
	},
	{
		set: function(data){
			this.upcoming = data;
			return this;
		},
		render: function(context, buffer){
			if(this.contents.data != this.upcoming){
				var old = this.contents.data;
				this.contents.data = this.upcoming;
				buffer.onChangeData && buffer.onChangeData(this.contents, old, this.upcoming);
			}
			return buffer.concat(this.contents);
		},
		unrender: function(context, buffer){
			return buffer.remove(this.contents);
		},
		isEmpty: function(){
			return !lang.trim(this.contents.data);
		},
		clone: function(){
			return new this.constructor(this.contents.data);
		}
	});

	dd._DomParser = lang.extend(function(tokens){
		// summary:
		//		Turn a simple array into a set of objects
		// description:
		//		This is also used by all tags to move through
		//		the list of nodes.
		this.contents = tokens;
	},
	{
		i: 0,
		parse: function(/*Array?*/ stop_at){
			var terminators = {};
			var tokens = this.contents;
			if(!stop_at){
				stop_at = [];
			}
			for(var i = 0; i < stop_at.length; i++){
				terminators[stop_at[i]] = true;
			}
			var nodelist = new dd._DomNodeList();
			while(this.i < tokens.length){
				var token = tokens[this.i++];
				var type = token[0];
				var value = token[1];
				if(type == dd.TOKEN_CUSTOM){
					nodelist.push(value);
				}else if(type == dd.TOKEN_CHANGE){
					var changeNode = new dd.ChangeNode(value, token[2], token[3]);
					value[changeNode.attr] = changeNode;
					nodelist.push(changeNode);
				}else if(type == dd.TOKEN_ATTR){
					var fn = ddt.getTag("attr:" + token[2], true);
					if(fn && token[3]){
						if (token[3].indexOf("{%") != -1 || token[3].indexOf("{{") != -1) {
							value.setAttribute(token[2], "");
						}
						nodelist.push(fn(null, new dd.Token(type, token[2] + " " + token[3])));
					}else if(lang.isString(token[3])){
						if(token[2] == "style" || token[3].indexOf("{%") != -1 || token[3].indexOf("{{") != -1){
							nodelist.push(new dd.AttributeNode(token[2], token[3]));
						}else if(lang.trim(token[3])){
							try{
								html.attr(value, token[2], token[3]);
							}catch(e){}
						}
					}
				}else if(type == dd.TOKEN_NODE){
					var fn = ddt.getTag("node:" + value.tagName.toLowerCase(), true);
					if(fn){
						// TODO: We need to move this to tokenization so that it's before the
						//				node and the parser can be passed here instead of null
						nodelist.push(fn(null, new dd.Token(type, value), value.tagName.toLowerCase()));
					}
					nodelist.push(new dd._DomNode(value));
				}else if(type == dd.TOKEN_VAR){
					nodelist.push(new dd._DomVarNode(value));
				}else if(type == dd.TOKEN_TEXT){
					nodelist.push(new dd._DomTextNode(value.data || value));
				}else if(type == dd.TOKEN_BLOCK){
					if(terminators[value]){
						--this.i;
						return nodelist;
					}
					var cmd = value.split(/\s+/g);
					if(cmd.length){
						cmd = cmd[0];
						var fn = ddt.getTag(cmd);
						if(typeof fn != "function"){
							throw new Error("Function not found for " + cmd);
						}
						var tpl = fn(this, new dd.Token(type, value));
						if(tpl){
							nodelist.push(tpl);
						}
					}
				}
			}

			if(stop_at.length){
				throw new Error("Could not find closing tag(s): " + stop_at.toString());
			}

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
			return dd._Parser.prototype.skip_past.call(this, endtag);
		},
		create_variable_node: function(expr){
			return new dd._DomVarNode(expr);
		},
		create_text_node: function(expr){
			return new dd._DomTextNode(expr || "");
		},
		getTemplate: function(/*String*/ loc){
			return new dd.DomTemplate(ddh.getTemplate(loc));
		}
	});
	return dojox.dtl.dom;
});
