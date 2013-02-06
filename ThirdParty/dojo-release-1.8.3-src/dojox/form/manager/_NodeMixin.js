define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/dom",
	"dojo/dom-attr",
	"dojo/query",
	"./_Mixin",
	"dijit/form/_FormWidget",
	"dijit/_base/manager",
	"dojo/_base/declare"
], function(lang, array, connect, dom, domAttr, query, _Mixin, _FormWidget, manager, declare){
	var fm = lang.getObject("dojox.form.manager", true),
		aa = fm.actionAdapter,
		keys = fm._keys,

		ce = fm.changeEvent = function(node){
			// summary:
			//		Function that returns a valid "onchange" event for a given form node.
			// node: Node
			//		Form node.

			var eventName = "onclick";
			switch(node.tagName.toLowerCase()){
				case "textarea":
					eventName = "onkeyup";
					break;
				case "select":
					eventName = "onchange";
					break;
				case "input":
					switch(node.type.toLowerCase()){
						case "text":
						case "password":
							eventName = "onkeyup";
							break;
					}
					break;
				// button, input/button, input/checkbox, input/radio,
				// input/file, input/image, input/submit, input/reset
				// use "onclick" (the default)
			}
			return eventName;	// String
		},

		registerNode = function(node, groupNode){
			var name = domAttr.get(node, "name");
			groupNode = groupNode || this.domNode;
			if(name && !(name in this.formWidgets)){
				// verify that it is not part of any widget
				for(var n = node; n && n !== groupNode; n = n.parentNode){
					if(domAttr.get(n, "widgetId") && manager.byNode(n).isInstanceOf(_FormWidget)){
						// this is a child of some widget --- bail out
						return null;
					}
				}
				// register the node
				if(node.tagName.toLowerCase() == "input" && node.type.toLowerCase() == "radio"){
					var a = this.formNodes[name];
					a = a && a.node;
					if(a && lang.isArray(a)){
						a.push(node);
					}else{
						this.formNodes[name] = {node: [node], connections: []};
					}
				}else{
					this.formNodes[name] = {node: node, connections: []};
				}
			}else{
				name = null;
			}
			return name;
		},

		getObserversFromNode = function(name){
			var observers = {};
			aa(function(_, n){
				var o = domAttr.get(n, "observer");
				if(o && typeof o == "string"){
					array.forEach(o.split(","), function(o){
						o = lang.trim(o);
						if(o && lang.isFunction(this[o])){
							observers[o] = 1;
						}
					}, this);
				}
			}).call(this, null, this.formNodes[name].node);
			return keys(observers);
		},

		connectNode = function(name, observers){
			var t = this.formNodes[name], c = t.connections;
			if(c.length){
				array.forEach(c, connect.disconnect);
				c = t.connections = [];
			}
			aa(function(_, n){
				// the next line is a crude workaround for Button that fires onClick instead of onChange
				var eventName = ce(n);
				array.forEach(observers, function(o){
					c.push(connect.connect(n, eventName, this, function(evt){
						if(this.watching){
							this[o](this.formNodeValue(name), name, n, evt);
						}
					}));
				}, this);
			}).call(this, null, t.node);
		};

	return declare("dojox.form.manager._NodeMixin", null, {
		// summary:
		//		Mixin to orchestrate dynamic forms (works with DOM nodes).
		// description:
		//		This mixin provides a foundation for an enhanced form
		//		functionality: unified access to individual form elements,
		//		unified "onchange" event processing, and general event
		//		processing. It complements dojox.form.manager._Mixin
		//		extending the functionality to DOM nodes.

		destroy: function(){
			// summary:
			//		Called when the widget is being destroyed

			for(var name in this.formNodes){
				array.forEach(this.formNodes[name].connections, connect.disconnect);
			}
			this.formNodes = {};

			this.inherited(arguments);
		},

		// register/unregister widgets and nodes

		registerNode: function(node){
			// summary:
			//		Register a node with the form manager
			// node: String|Node
			//		A node, or its id
			// returns: Object
			//		Returns self
			if(typeof node == "string"){
				node = dom.byId(node);
			}
			var name = registerNode.call(this, node);
			if(name){
				connectNode.call(this, name, getObserversFromNode.call(this, name));
			}
			return this;
		},

		unregisterNode: function(name){
			// summary:
			//		Removes the node by name from internal tables unregistering
			//		connected observers
			// name: String
			//		Name of the to unregister
			// returns: Object
			//		Returns self
			if(name in this.formNodes){
				array.forEach(this.formNodes[name].connections, this.disconnect, this);
				delete this.formNodes[name];
			}
			return this;
		},

		registerNodeDescendants: function(node){
			// summary:
			//		Register node's descendants (form nodes) with the form manager
			// node: String|Node
			//		A widget, or its widgetId, or its DOM node
			// returns: Object
			//		Returns self

			if(typeof node == "string"){
				node = dom.byId(node);
			}

			query("input, select, textarea, button", node).
				map(function(n){
					return registerNode.call(this, n, node);
				}, this).
				forEach(function(name){
					if(name){
						connectNode.call(this, name, getObserversFromNode.call(this, name));
					}
				}, this);

			return this;
		},

		unregisterNodeDescendants: function(node){
			// summary:
			//		Unregister node's descendants (form nodes) with the form manager
			// node: String|Node
			//		A widget, or its widgetId, or its DOM node
			// returns: Object
			//		Returns self

			if(typeof node == "string"){
				node = dom.byId(node);
			}

			query("input, select, textarea, button", node).
				map(function(n){ return domAttr.get(node, "name") || null; }).
				forEach(function(name){
					if(name){
						this.unregisterNode(name);
					}
				}, this);

			return this;
		},

		// value accessors

		formNodeValue: function(elem, value){
			// summary:
			//		Set or get a form element by name.
			// elem: String|Node|Array
			//		Form element's name, DOM node, or array or radio nodes.
			// value: Object?
			//		Optional. The value to set.
			// returns: Object
			//		For a getter it returns the value, for a setter it returns
			//		self. If the elem is not valid, null will be returned.

			var isSetter = arguments.length == 2 && value !== undefined, result;

			if(typeof elem == "string"){
				elem = this.formNodes[elem];
				if(elem){
					elem = elem.node;
				}
			}

			if(!elem){
				return null;	// Object
			}

			if(lang.isArray(elem)){
				// input/radio array
				if(isSetter){
					array.forEach(elem, function(node){
						node.checked = "";
					});
					array.forEach(elem, function(node){
						node.checked = node.value === value ? "checked" : "";
					});
					return this;	// self
				}
				// getter
				array.some(elem, function(node){
					if(node.checked){
						result = node;
						return true;
					}
					return false;
				});
				return result ? result.value : "";	// String
			}
			// all other elements
			switch(elem.tagName.toLowerCase()){
				case "select":
					if(elem.multiple){
						// multiple is allowed
						if(isSetter){
							if(lang.isArray(value)){
								var dict = {};
								array.forEach(value, function(v){
									dict[v] = 1;
								});
								query("> option", elem).forEach(function(opt){
									opt.selected = opt.value in dict;
								});
								return this;	// self
							}
							// singular property
							query("> option", elem).forEach(function(opt){
								opt.selected = opt.value === value;
							});
							return this;	// self
						}
						// getter
						var result = query("> option", elem).filter(function(opt){
							return opt.selected;
						}).map(function(opt){
							return opt.value;
						});
						return result.length == 1 ? result[0] : result;	// Object
					}
					// singular
					if(isSetter){
						query("> option", elem).forEach(function(opt){
							opt.selected = opt.value === value;
						});
						return this;	// self
					}
					// getter
					return elem.value || ""; // String
				case "button":
					if(isSetter){
						elem.innerHTML = "" + value;
						return this;
					}
					// getter
					return elem.innerHTML;
				case "input":
					if(elem.type.toLowerCase() == "checkbox"){
						// input/checkbox element
						if(isSetter){
							elem.checked = value ? "checked" : "";
							return this;
						}
						// getter
						return Boolean(elem.checked);
					}
			}
			// the rest of inputs
			if(isSetter){
				elem.value = "" + value;
				return this;
			}
			// getter
			return elem.value;
		},

		// inspectors

		inspectFormNodes: function(inspector, state, defaultValue){
			// summary:
			//		Run an inspector function on controlled form elements returning a result object.
			// inspector: Function
			//		A function to be called on a form element. Takes three arguments: a name, a node or
			//		an array of nodes, and a supplied value. Runs in the context of the form manager.
			//		Returns a value that will be collected and returned as a state.
			// state: Object?
			//		Optional. If a name-value dictionary --- only listed names will be processed.
			//		If an array, all names in the array will be processed with defaultValue.
			//		If omitted or null, all form elements will be processed with defaultValue.
			// defaultValue: Object?
			//		Optional. The default state (true, if omitted).

			var name, result = {};

			if(state){
				if(lang.isArray(state)){
					array.forEach(state, function(name){
						if(name in this.formNodes){
							result[name] = inspector.call(this, name, this.formNodes[name].node, defaultValue);
						}
					}, this);
				}else{
					for(name in state){
						if(name in this.formNodes){
							result[name] = inspector.call(this, name, this.formNodes[name].node, state[name]);
						}
					}
				}
			}else{
				for(name in this.formNodes){
					result[name] = inspector.call(this, name, this.formNodes[name].node, defaultValue);
				}
			}

			return result;	// Object
		}
	});
});
