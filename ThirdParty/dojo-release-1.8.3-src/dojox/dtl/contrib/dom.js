define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/connect",
	"dojo/dom-style",
	"dojo/dom-construct",
	"../_base",
	"../dom"
], function(kernel,lang,connect,domStyle,domConstruct,dd,dddom){

	var ddch = lang.getObject("dojox.dtl.contrib.dom", true);

	var simple = {render: function(){ return this.contents; }};

	ddch.StyleNode = lang.extend(function(styles){
		this.contents = {};
		this._current = {};
		this._styles = styles;
		for(var key in styles){
			if(styles[key].indexOf("{{") != -1){
				var node = new dd.Template(styles[key]);
			}else{
				var node = lang.delegate(simple);
				node.contents = styles[key];
			}
			this.contents[key] = node;
		}
	},
	{
		render: function(context, buffer){
			for(var key in this.contents){
				var value = this.contents[key].render(context);
				if(this._current[key] != value){
					domStyle.set(buffer.getParent(), key, this._current[key] = value);
				}
			}
			return buffer;
		},
		unrender: function(context, buffer){
			this._current = {};
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this._styles);
		}
	});

	ddch.BufferNode = lang.extend(function(nodelist, options){
		this.nodelist = nodelist;
		this.options = options;
	},
	{
		_swap: function(type, node){
			if(!this.swapped && this.parent.parentNode){
				if(type == "node"){
					if((node.nodeType == 3 && !this.options.text) || (node.nodeType == 1 && !this.options.node)){
						return;
					}
				}else if(type == "class"){
					if(type != "class"){
						return;
					}
				}

				this.onAddNode && connect.disconnect(this.onAddNode);
				this.onRemoveNode && connect.disconnect(this.onRemoveNode);
				this.onChangeAttribute && connect.disconnect(this.onChangeAttribute);
				this.onChangeData && connect.disconnect(this.onChangeData);

				this.swapped = this.parent.cloneNode(true);
				this.parent.parentNode.replaceChild(this.swapped, this.parent);
			}
		},
		render: function(context, buffer){
			this.parent = buffer.getParent();
			if(this.options.node){
				this.onAddNode = connect.connect(buffer, "onAddNode", lang.hitch(this, "_swap", "node"));
				this.onRemoveNode = connect.connect(buffer, "onRemoveNode", lang.hitch(this, "_swap", "node"));
			}
			if(this.options.text){
				this.onChangeData = connect.connect(buffer, "onChangeData", lang.hitch(this, "_swap", "node"));
			}
			if(this.options["class"]){
				this.onChangeAttribute = connect.connect(buffer, "onChangeAttribute", lang.hitch(this, "_swap", "class"));
			}

			buffer = this.nodelist.render(context, buffer);

			if(this.swapped){
				this.swapped.parentNode.replaceChild(this.parent, this.swapped);
				domConstruct.destroy(this.swapped);
			}else{
				this.onAddNode && connect.disconnect(this.onAddNode);
				this.onRemoveNode && connect.disconnect(this.onRemoveNode);
				this.onChangeAttribute && connect.disconnect(this.onChangeAttribute);
				this.onChangeData && connect.disconnect(this.onChangeData);
			}

			delete this.parent;
			delete this.swapped;
			return buffer;
		},
		unrender: function(context, buffer){
			return this.nodelist.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.nodelist.clone(buffer), this.options);
		}
	});

	lang.mixin(ddch, {
		buffer: function(parser, token){
			// summary:
			//		Buffer large DOM manipulations during re-render.
			// description:
			//		When using DomTemplate, wrap any content
			//		that you expect to change often during
			//		re-rendering. It will then remove its parent
			//		from the main document while it re-renders that
			//		section of code. It will only remove it from
			//		the main document if a mainpulation of somes sort
			//		happens. ie It won't swap out if it diesn't have to.
			// example:
			//		By default, it considers only node addition/removal
			//		to be "changing"
			//
			//		|	{% buffer %}{% for item in items %}<li>{{ item }}</li>{% endfor %}{% endbuffer %}
			// example:
			//		You can explicitly declare options:
			//
			//		- node: Watch node removal/addition
			//		- class: Watch for a classname to be changed
			//		- text: Watch for any text to be changed
			//
			//	|	{% buffer node class %}{% for item in items %}<li>{{ item }}</li>{% endfor %}{% endbuffer %}
			var parts = token.contents.split().slice(1);
			var options = {};
			var found = false;
			for(var i = parts.length; i--;){
				found = true;
				options[parts[i]] = true;
			}
			if(!found){
				options.node = true;
			}
			var nodelist = parser.parse(["endbuffer"]);
			parser.next_token();
			return new ddch.BufferNode(nodelist, options);
		},
		html: function(parser, token){
			kernel.deprecated("{% html someVariable %}", "Use {{ someVariable|safe }} instead");
			return parser.create_variable_node(token.contents.slice(5) + "|safe");
		},
		style_: function(parser, token){
			var styles = {};
			token = token.contents.replace(/^style\s+/, "");
			var rules = token.split(/\s*;\s*/g);
			for(var i = 0, rule; rule = rules[i]; i++){
				var parts = rule.split(/\s*:\s*/g);
				var key = parts[0];
				var value = lang.trim(parts[1]);
				if(value){
					styles[key] = value;
				}
			}
			return new ddch.StyleNode(styles);
		}
	});

	dd.register.tags("dojox.dtl.contrib", {
		"dom": ["html", "attr:style", "buffer"]
	});
	return dojox.dtl.contrib.dom;
});