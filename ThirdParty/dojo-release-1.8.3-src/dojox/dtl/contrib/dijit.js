define([
	"dojo/_base/lang",
	"dojo/_base/connect",
	"dojo/_base/array",
	"dojo/query",
	"../_base",
	"../dom",
	"dojo/parser",
	"dojo/_base/sniff"
], function(lang,connect,array,Query,dd,dxdom,Parser,has){

	lang.getObject("dojox.dtl.contrib.dijit", true);
	var ddcd = dd.contrib.dijit;
	ddcd.AttachNode = lang.extend(function(keys, object){
		this._keys = keys;
		this._object = object;
	},
	{
		render: function(context, buffer){
			if(!this._rendered){
				this._rendered = true;
				for(var i = 0, key; key = this._keys[i]; i++){
					context.getThis()[key] = this._object || buffer.getParent();
				}
			}
			return buffer;
		},
		unrender: function(context, buffer){
			if(this._rendered){
				this._rendered = false;
				for(var i = 0, key; key = this._keys[i]; i++){
					if(context.getThis()[key] === (this._object || buffer.getParent())){
						delete context.getThis()[key];
					}
				}
			}
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this._keys, this._object);
		}
	});

	ddcd.EventNode = lang.extend(function(command, obj){
		this._command = command;

		var type, events = command.split(/\s*,\s*/);
		var trim = lang.trim;
		var types = [];
		var fns = [];
		while(type = events.pop()){
			if(type){
				var fn = null;
				if(type.indexOf(":") != -1){
					// oh, if only JS had tuple assignment
					var funcNameArr = type.split(":");
					type = trim(funcNameArr[0]);
					fn = trim(funcNameArr.slice(1).join(":"));
				}else{
					type = trim(type);
				}
				if(!fn){
					fn = type;
				}
				types.push(type);
				fns.push(fn);
			}
		}

		this._types = types;
		this._fns = fns;
		this._object = obj;
		this._rendered = [];
	},
	{
		// _clear: Boolean
		//		Make sure we kill the actual tags (onclick problems, etc)
		_clear: false,
		render: function(context, buffer){
			for(var i = 0, type; type = this._types[i]; i++){
				if(!this._clear && !this._object){
					buffer.getParent()[type] = null;
				}
				var fn = this._fns[i];
				var args;
				if(fn.indexOf(" ") != -1){
					if(this._rendered[i]){
						connect.disconnect(this._rendered[i]);
						this._rendered[i] = false;
					}
					args = array.map(fn.split(" ").slice(1), function(item){
						return new dd._Filter(item).resolve(context);
					});
					fn = fn.split(" ", 2)[0];
				}
				if(!this._rendered[i]){
					if(!this._object){
						this._rendered[i] = buffer.addEvent(context, type, fn, args);
					}else{
						this._rendered[i] = connect.connect(this._object, type, context.getThis(), fn);
					}
				}
			}
			this._clear = true;

			return buffer;
		},
		unrender: function(context, buffer){
			while(this._rendered.length){
				connect.disconnect(this._rendered.pop());
			}
			return buffer;
		},
		clone: function(){
			return new this.constructor(this._command, this._object);
		}
	});

	function cloneNode(n1){
		var n2 = n1.cloneNode(true);
		if(has("ie")){
			Query("script", n2).forEach("item.text = this[index].text;", Query("script", n1));
		}
		return n2;
	}

	ddcd.DojoTypeNode = lang.extend(function(node, parsed){
		this._node = node;
		this._parsed = parsed;

		var events = node.getAttribute("dojoAttachEvent") || node.getAttribute("data-dojo-attach-event");
		if(events){
			this._events = new ddcd.EventNode(lang.trim(events));
		}
		var attach = node.getAttribute("dojoAttachPoint") || node.getAttribute("data-dojo-attach-point");
		if(attach){
			this._attach = new ddcd.AttachNode(lang.trim(attach).split(/\s*,\s*/));
		}

		if(!parsed){
			this._dijit = Parser.instantiate([cloneNode(node)])[0];
		}else{
			node = cloneNode(node);
			var old = ddcd.widgetsInTemplate;
			ddcd.widgetsInTemplate = false;
			this._template = new dd.DomTemplate(node);
			ddcd.widgetsInTemplate = old;
		}
	},
	{
		render: function(context, buffer){
			if(this._parsed){
				var _buffer = new dd.DomBuffer();
				this._template.render(context, _buffer);
				var root = cloneNode(_buffer.getRootNode());
				var div = document.createElement("div");
				div.appendChild(root);
				var rendered = div.innerHTML;
				div.removeChild(root);
				if(rendered != this._rendered){
					this._rendered = rendered;
					if(this._dijit){
						this._dijit.destroyRecursive();
					}
					this._dijit = Parser.instantiate([root])[0];
				}
			}

			var node = this._dijit.domNode;

			if(this._events){
				this._events._object = this._dijit;
				this._events.render(context, buffer);
			}
			if(this._attach){
				this._attach._object = this._dijit;
				this._attach.render(context, buffer);
			}

			return buffer.concat(node);
		},
		unrender: function(context, buffer){
			return buffer.remove(this._dijit.domNode);
		},
		clone: function(){
			return new this.constructor(this._node, this._parsed);
		}
	});

	lang.mixin(ddcd, {
		widgetsInTemplate: true,
		dojoAttachPoint: function(parser, token){
			return new ddcd.AttachNode(token.contents.slice(token.contents.indexOf("data-") !== -1 ? 23 : 16).split(/\s*,\s*/));
		},
		dojoAttachEvent: function(parser, token){
			return new ddcd.EventNode(token.contents.slice(token.contents.indexOf("data-") !== -1 ? 23 : 16));
		},
		dojoType: function(parser, token){
			var parsed = false;
			if(token.contents.slice(-7) == " parsed"){
				parsed = true;
			}
			var contents = token.contents.indexOf("data-") !== -1 ? token.contents.slice(15)  : token.contents.slice(9);
			var dojoType = parsed ? contents.slice(0, -7) : contents.toString();

			if(ddcd.widgetsInTemplate){
				var node = parser.swallowNode();
				node.setAttribute("data-dojo-type", dojoType);
				return new ddcd.DojoTypeNode(node, parsed);
			}

			return new dd.AttributeNode("data-dojo-type", dojoType);
		},
		on: function(parser, token){
			// summary:
			//		Associates an event type to a function (on the current widget) by name
			var parts = token.contents.split();
			return new ddcd.EventNode(parts[0] + ":" + parts.slice(1).join(" "));
		}
	});
	ddcd["data-dojo-type"] = ddcd.dojoType;
	ddcd["data-dojo-attach-point"] = ddcd.dojoAttachPoint;
	ddcd["data-dojo-attach-event"] = ddcd.dojoAttachEvent;
	

	dd.register.tags("dojox.dtl.contrib", {
		"dijit": ["attr:dojoType", "attr:data-dojo-type", "attr:dojoAttachPoint", "attr:data-dojo-attach-point", ["attr:attach", "dojoAttachPoint"], ["attr:attach", "data-dojo-attach-point"], "attr:dojoAttachEvent", "attr:data-dojo-attach-event", [/(attr:)?on(click|key(up))/i, "on"]]
	});
	return dojox.dtl.contrib.dijit;
});
