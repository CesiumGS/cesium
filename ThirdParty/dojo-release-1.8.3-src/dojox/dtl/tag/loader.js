define([
	"dojo/_base/lang",
	"../_base",
	"dojo/_base/array",
	"dojo/_base/connect"
], function(lang,dd,array,connect){

	lang.getObject("dojox.dtl.tag.loader", true);

	var ddtl = dd.tag.loader;

	ddtl.BlockNode = lang.extend(function(name, nodelist){
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
				var setParent = connect.connect(buffer, "onSetParent", function(node, up, root){
					if(up && root){
						buffer.setParent(bufferParent);
					}
				});
			}
			buffer = nodelist.render(context, buffer, this);
			setParent && connect.disconnect(setParent);
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

	ddtl.ExtendsNode = lang.extend(function(getTemplate, nodelist, shared, parent, key){
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

	ddtl.IncludeNode = lang.extend(function(path, constant, getTemplate, text, parsed){
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

	lang.mixin(ddtl, {
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
	return dojox.dtl.tag.loader;
});