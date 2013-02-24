define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/connect",
	"../_base"
], function(lang,array,connect,dd){

	lang.getObject("dojox.dtl.tag.misc", true);

	var ddtm = dd.tag.misc;

	ddtm.DebugNode = lang.extend(function(text){
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

	ddtm.FilterNode = lang.extend(function(varnode, nodelist){
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

	ddtm.FirstOfNode = lang.extend(function(vars, text){
		this._vars = vars;
		this.vars = array.map(vars, function(item){
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

	ddtm.SpacelessNode = lang.extend(function(nodelist, text){
		this.nodelist = nodelist;
		this.contents = text;
	},
	{
		render: function(context, buffer){
			if(buffer.getParent){
				// Unfortunately, we have to branch here
				var watch = [
					connect.connect(buffer, "onAddNodeComplete", this, "_watch"),
					connect.connect(buffer, "onSetParent", this, "_watchParent")
				];
				buffer = this.nodelist.render(context, buffer);
				connect.disconnect(watch[0]);
				connect.disconnect(watch[1]);
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

	ddtm.TemplateTagNode = lang.extend(function(tag, text){
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

	ddtm.WidthRatioNode = lang.extend(function(current, max, width, text){
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

	ddtm.WithNode = lang.extend(function(target, alias, nodelist){
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

	lang.mixin(ddtm, {
		comment: function(parser, token){
			// summary:
			//		Ignore everything between {% comment %} and {% endcomment %}
			parser.skip_past("endcomment");
			return dd._noOpNode;
		},
		debug: function(parser, token){
			// summary:
			//		Output the current context, maybe add more stuff later.
			return new ddtm.DebugNode(parser.create_text_node());
		},
		filter: function(parser, token){
			// summary:
			//		Filter the contents of the blog through variable filters.
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
	return dojox.dtl.tag.misc;
});