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

if(!dojo._hasResource["dijit._base.manager"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.manager"] = true;
dojo.provide("dijit._base.manager");


dojo.declare("dijit.WidgetSet", null, {
	// summary:
	//		A set of widgets indexed by id. A default instance of this class is
	//		available as `dijit.registry`
	//
	// example:
	//		Create a small list of widgets:
	//		|	var ws = new dijit.WidgetSet();
	//		|	ws.add(dijit.byId("one"));
	//		| 	ws.add(dijit.byId("two"));
	//		|	// destroy both:
	//		|	ws.forEach(function(w){ w.destroy(); });
	//
	// example:
	//		Using dijit.registry:
	//		|	dijit.registry.forEach(function(w){ /* do something */ });

	constructor: function(){
		this._hash = {};
		this.length = 0;
	},

	add: function(/*dijit._Widget*/ widget){
		// summary:
		//		Add a widget to this list. If a duplicate ID is detected, a error is thrown.
		//
		// widget: dijit._Widget
		//		Any dijit._Widget subclass.
		if(this._hash[widget.id]){
			throw new Error("Tried to register widget with id==" + widget.id + " but that id is already registered");
		}
		this._hash[widget.id] = widget;
		this.length++;
	},

	remove: function(/*String*/ id){
		// summary:
		//		Remove a widget from this WidgetSet. Does not destroy the widget; simply
		//		removes the reference.
		if(this._hash[id]){
			delete this._hash[id];
			this.length--;
		}
	},

	forEach: function(/*Function*/ func, /* Object? */thisObj){
		// summary:
		//		Call specified function for each widget in this set.
		//
		// func:
		//		A callback function to run for each item. Is passed the widget, the index
		//		in the iteration, and the full hash, similar to `dojo.forEach`.
		//
		// thisObj:
		//		An optional scope parameter
		//
		// example:
		//		Using the default `dijit.registry` instance:
		//		|	dijit.registry.forEach(function(widget){
		//		|		console.log(widget.declaredClass);
		//		|	});
		//
		// returns:
		//		Returns self, in order to allow for further chaining.

		thisObj = thisObj || dojo.global;
		var i = 0, id;
		for(id in this._hash){
			func.call(thisObj, this._hash[id], i++, this._hash);
		}
		return this;	// dijit.WidgetSet
	},

	filter: function(/*Function*/ filter, /* Object? */thisObj){
		// summary:
		//		Filter down this WidgetSet to a smaller new WidgetSet
		//		Works the same as `dojo.filter` and `dojo.NodeList.filter`
		//
		// filter:
		//		Callback function to test truthiness. Is passed the widget
		//		reference and the pseudo-index in the object.
		//
		// thisObj: Object?
		//		Option scope to use for the filter function.
		//
		// example:
		//		Arbitrary: select the odd widgets in this list
		//		|	dijit.registry.filter(function(w, i){
		//		|		return i % 2 == 0;
		//		|	}).forEach(function(w){ /* odd ones */ });

		thisObj = thisObj || dojo.global;
		var res = new dijit.WidgetSet(), i = 0, id;
		for(id in this._hash){
			var w = this._hash[id];
			if(filter.call(thisObj, w, i++, this._hash)){
				res.add(w);
			}
		}
		return res; // dijit.WidgetSet
	},

	byId: function(/*String*/ id){
		// summary:
		//		Find a widget in this list by it's id.
		// example:
		//		Test if an id is in a particular WidgetSet
		//		| var ws = new dijit.WidgetSet();
		//		| ws.add(dijit.byId("bar"));
		//		| var t = ws.byId("bar") // returns a widget
		//		| var x = ws.byId("foo"); // returns undefined

		return this._hash[id];	// dijit._Widget
	},

	byClass: function(/*String*/ cls){
		// summary:
		//		Reduce this widgetset to a new WidgetSet of a particular `declaredClass`
		//
		// cls: String
		//		The Class to scan for. Full dot-notated string.
		//
		// example:
		//		Find all `dijit.TitlePane`s in a page:
		//		|	dijit.registry.byClass("dijit.TitlePane").forEach(function(tp){ tp.close(); });

		var res = new dijit.WidgetSet(), id, widget;
		for(id in this._hash){
			widget = this._hash[id];
			if(widget.declaredClass == cls){
				res.add(widget);
			}
		 }
		 return res; // dijit.WidgetSet
},

	toArray: function(){
		// summary:
		//		Convert this WidgetSet into a true Array
		//
		// example:
		//		Work with the widget .domNodes in a real Array
		//		|	dojo.map(dijit.registry.toArray(), function(w){ return w.domNode; });

		var ar = [];
		for(var id in this._hash){
			ar.push(this._hash[id]);
		}
		return ar;	// dijit._Widget[]
},

	map: function(/* Function */func, /* Object? */thisObj){
		// summary:
		//		Create a new Array from this WidgetSet, following the same rules as `dojo.map`
		// example:
		//		|	var nodes = dijit.registry.map(function(w){ return w.domNode; });
		//
		// returns:
		//		A new array of the returned values.
		return dojo.map(this.toArray(), func, thisObj); // Array
	},

	every: function(func, thisObj){
		// summary:
		// 		A synthetic clone of `dojo.every` acting explicitly on this WidgetSet
		//
		// func: Function
		//		A callback function run for every widget in this list. Exits loop
		//		when the first false return is encountered.
		//
		// thisObj: Object?
		//		Optional scope parameter to use for the callback

		thisObj = thisObj || dojo.global;
		var x = 0, i;
		for(i in this._hash){
			if(!func.call(thisObj, this._hash[i], x++, this._hash)){
				return false; // Boolean
			}
		}
		return true; // Boolean
	},

	some: function(func, thisObj){
		// summary:
		// 		A synthetic clone of `dojo.some` acting explictly on this WidgetSet
		//
		// func: Function
		//		A callback function run for every widget in this list. Exits loop
		//		when the first true return is encountered.
		//
		// thisObj: Object?
		//		Optional scope parameter to use for the callback

		thisObj = thisObj || dojo.global;
		var x = 0, i;
		for(i in this._hash){
			if(func.call(thisObj, this._hash[i], x++, this._hash)){
				return true; // Boolean
			}
		}
		return false; // Boolean
	}

});

(function(){

	/*=====
	dijit.registry = {
		// summary:
		//		A list of widgets on a page.
		// description:
		//		Is an instance of `dijit.WidgetSet`
	};
	=====*/
	dijit.registry = new dijit.WidgetSet();

	var hash = dijit.registry._hash,
		attr = dojo.attr,
		hasAttr = dojo.hasAttr,
		style = dojo.style;

	dijit.byId = function(/*String|dijit._Widget*/ id){
		// summary:
		//		Returns a widget by it's id, or if passed a widget, no-op (like dojo.byId())
		return typeof id == "string" ? hash[id] : id; // dijit._Widget
	};

	var _widgetTypeCtr = {};
	dijit.getUniqueId = function(/*String*/widgetType){
		// summary:
		//		Generates a unique id for a given widgetType
	
		var id;
		do{
			id = widgetType + "_" +
				(widgetType in _widgetTypeCtr ?
					++_widgetTypeCtr[widgetType] : _widgetTypeCtr[widgetType] = 0);
		}while(hash[id]);
		return dijit._scopeName == "dijit" ? id : dijit._scopeName + "_" + id; // String
	};
	
	dijit.findWidgets = function(/*DomNode*/ root){
		// summary:
		//		Search subtree under root returning widgets found.
		//		Doesn't search for nested widgets (ie, widgets inside other widgets).
	
		var outAry = [];
	
		function getChildrenHelper(root){
			for(var node = root.firstChild; node; node = node.nextSibling){
				if(node.nodeType == 1){
					var widgetId = node.getAttribute("widgetId");
					if(widgetId){
						var widget = hash[widgetId];
						if(widget){	// may be null on page w/multiple dojo's loaded
							outAry.push(widget);
						}
					}else{
						getChildrenHelper(node);
					}
				}
			}
		}
	
		getChildrenHelper(root);
		return outAry;
	};
	
	dijit._destroyAll = function(){
		// summary:
		//		Code to destroy all widgets and do other cleanup on page unload
	
		// Clean up focus manager lingering references to widgets and nodes
		dijit._curFocus = null;
		dijit._prevFocus = null;
		dijit._activeStack = [];
	
		// Destroy all the widgets, top down
		dojo.forEach(dijit.findWidgets(dojo.body()), function(widget){
			// Avoid double destroy of widgets like Menu that are attached to <body>
			// even though they are logically children of other widgets.
			if(!widget._destroyed){
				if(widget.destroyRecursive){
					widget.destroyRecursive();
				}else if(widget.destroy){
					widget.destroy();
				}
			}
		});
	};
	
	if(dojo.isIE){
		// Only run _destroyAll() for IE because we think it's only necessary in that case,
		// and because it causes problems on FF.  See bug #3531 for details.
		dojo.addOnWindowUnload(function(){
			dijit._destroyAll();
		});
	}
	
	dijit.byNode = function(/*DOMNode*/ node){
		// summary:
		//		Returns the widget corresponding to the given DOMNode
		return hash[node.getAttribute("widgetId")]; // dijit._Widget
	};
	
	dijit.getEnclosingWidget = function(/*DOMNode*/ node){
		// summary:
		//		Returns the widget whose DOM tree contains the specified DOMNode, or null if
		//		the node is not contained within the DOM tree of any widget
		while(node){
			var id = node.getAttribute && node.getAttribute("widgetId");
			if(id){
				return hash[id];
			}
			node = node.parentNode;
		}
		return null;
	};

	var shown = (dijit._isElementShown = function(/*Element*/ elem){
		var s = style(elem);
		return (s.visibility != "hidden")
			&& (s.visibility != "collapsed")
			&& (s.display != "none")
			&& (attr(elem, "type") != "hidden");
	});
	
	dijit.hasDefaultTabStop = function(/*Element*/ elem){
		// summary:
		//		Tests if element is tab-navigable even without an explicit tabIndex setting
	
		// No explicit tabIndex setting, need to investigate node type
		switch(elem.nodeName.toLowerCase()){
			case "a":
				// An <a> w/out a tabindex is only navigable if it has an href
				return hasAttr(elem, "href");
			case "area":
			case "button":
			case "input":
			case "object":
			case "select":
			case "textarea":
				// These are navigable by default
				return true;
			case "iframe":
				// If it's an editor <iframe> then it's tab navigable.
				var body;
				try{
					// non-IE
					var contentDocument = elem.contentDocument;
					if("designMode" in contentDocument && contentDocument.designMode == "on"){
						return true;
					}
					body = contentDocument.body;
				}catch(e1){
					// contentWindow.document isn't accessible within IE7/8
					// if the iframe.src points to a foreign url and this
					// page contains an element, that could get focus
					try{
						body = elem.contentWindow.document.body;
					}catch(e2){
						return false;
					}
				}
				return body.contentEditable == 'true' || (body.firstChild && body.firstChild.contentEditable == 'true');
			default:
				return elem.contentEditable == 'true';
		}
	};
	
	var isTabNavigable = (dijit.isTabNavigable = function(/*Element*/ elem){
		// summary:
		//		Tests if an element is tab-navigable
	
		// TODO: convert (and rename method) to return effective tabIndex; will save time in _getTabNavigable()
		if(attr(elem, "disabled")){
			return false;
		}else if(hasAttr(elem, "tabIndex")){
			// Explicit tab index setting
			return attr(elem, "tabIndex") >= 0; // boolean
		}else{
			// No explicit tabIndex setting, so depends on node type
			return dijit.hasDefaultTabStop(elem);
		}
	});

	dijit._getTabNavigable = function(/*DOMNode*/ root){
		// summary:
		//		Finds descendants of the specified root node.
		//
		// description:
		//		Finds the following descendants of the specified root node:
		//		* the first tab-navigable element in document order
		//		  without a tabIndex or with tabIndex="0"
		//		* the last tab-navigable element in document order
		//		  without a tabIndex or with tabIndex="0"
		//		* the first element in document order with the lowest
		//		  positive tabIndex value
		//		* the last element in document order with the highest
		//		  positive tabIndex value
		var first, last, lowest, lowestTabindex, highest, highestTabindex, radioSelected = {};
		function radioName(node) {
			// If this element is part of a radio button group, return the name for that group.
			return node && node.tagName.toLowerCase() == "input" &&
				node.type && node.type.toLowerCase() == "radio" &&
				node.name && node.name.toLowerCase();
		}
		var walkTree = function(/*DOMNode*/parent){
			dojo.query("> *", parent).forEach(function(child){
				// Skip hidden elements, and also non-HTML elements (those in custom namespaces) in IE,
				// since show() invokes getAttribute("type"), which crash on VML nodes in IE.
				if((dojo.isIE && child.scopeName!=="HTML") || !shown(child)){
					return;
				}

				if(isTabNavigable(child)){
					var tabindex = attr(child, "tabIndex");
					if(!hasAttr(child, "tabIndex") || tabindex == 0){
						if(!first){ first = child; }
						last = child;
					}else if(tabindex > 0){
						if(!lowest || tabindex < lowestTabindex){
							lowestTabindex = tabindex;
							lowest = child;
						}
						if(!highest || tabindex >= highestTabindex){
							highestTabindex = tabindex;
							highest = child;
						}
					}
					var rn = radioName(child);
					if(dojo.attr(child, "checked") && rn) {
						radioSelected[rn] = child;
					}
				}
				if(child.nodeName.toUpperCase() != 'SELECT'){
					walkTree(child);
				}
			});
		};
		if(shown(root)){ walkTree(root) }
		function rs(node) {
			// substitute checked radio button for unchecked one, if there is a checked one with the same name.
			return radioSelected[radioName(node)] || node;
		}
		return { first: rs(first), last: rs(last), lowest: rs(lowest), highest: rs(highest) };
	}
	dijit.getFirstInTabbingOrder = function(/*String|DOMNode*/ root){
		// summary:
		//		Finds the descendant of the specified root node
		//		that is first in the tabbing order
		var elems = dijit._getTabNavigable(dojo.byId(root));
		return elems.lowest ? elems.lowest : elems.first; // DomNode
	};
	
	dijit.getLastInTabbingOrder = function(/*String|DOMNode*/ root){
		// summary:
		//		Finds the descendant of the specified root node
		//		that is last in the tabbing order
		var elems = dijit._getTabNavigable(dojo.byId(root));
		return elems.last ? elems.last : elems.highest; // DomNode
	};
	
	/*=====
	dojo.mixin(dijit, {
		// defaultDuration: Integer
		//		The default animation speed (in ms) to use for all Dijit
		//		transitional animations, unless otherwise specified
		//		on a per-instance basis. Defaults to 200, overrided by
		//		`djConfig.defaultDuration`
		defaultDuration: 200
	});
	=====*/
	
	dijit.defaultDuration = dojo.config["defaultDuration"] || 200;

})();

}

if(!dojo._hasResource["dojo.Stateful"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.Stateful"] = true;
dojo.provide("dojo.Stateful");


dojo.declare("dojo.Stateful", null, {
	// summary:
	//		Base class for objects that provide named properties with optional getter/setter
	//		control and the ability to watch for property changes
	// example:
	//	|	var obj = new dojo.Stateful();
	//	|	obj.watch("foo", function(){
	//	|		console.log("foo changed to " + this.get("foo"));
	//	|	});
	//	|	obj.set("foo","bar");
	postscript: function(mixin){
		if(mixin){
			dojo.mixin(this, mixin);
		}
	},
	
	get: function(/*String*/name){
		// summary:
		//		Get a property on a Stateful instance.
		//	name:
		//		The property to get.
		// description:
		//		Get a named property on a Stateful object. The property may
		//		potentially be retrieved via a getter method in subclasses. In the base class
		// 		this just retrieves the object's property.
		// 		For example:
		//	|	stateful = new dojo.Stateful({foo: 3});
		//	|	stateful.get("foo") // returns 3
		//	|	stateful.foo // returns 3
		
		return this[name];
	},
	set: function(/*String*/name, /*Object*/value){
		// summary:
		//		Set a property on a Stateful instance
		//	name:
		//		The property to set.
		//	value:
		//		The value to set in the property.
		// description:
		//		Sets named properties on a stateful object and notifies any watchers of
		// 		the property. A programmatic setter may be defined in subclasses.
		// 		For example:
		//	|	stateful = new dojo.Stateful();
		//	|	stateful.watch(function(name, oldValue, value){
		//	|		// this will be called on the set below
		//	|	}
		//	|	stateful.set(foo, 5);
		//
		//	set() may also be called with a hash of name/value pairs, ex:
		//	|	myObj.set({
		//	|		foo: "Howdy",
		//	|		bar: 3
		//	|	})
		//	This is equivalent to calling set(foo, "Howdy") and set(bar, 3)
		if(typeof name === "object"){
			for(var x in name){
				this.set(x, name[x]);
			}
			return this;
		}
		var oldValue = this[name];
		this[name] = value;
		if(this._watchCallbacks){
			this._watchCallbacks(name, oldValue, value);
		}
		return this;
	},
	watch: function(/*String?*/name, /*Function*/callback){
		// summary:
		//		Watches a property for changes
		//	name:
		//		Indicates the property to watch. This is optional (the callback may be the
		// 		only parameter), and if omitted, all the properties will be watched
		// returns:
		//		An object handle for the watch. The unwatch method of this object
		// 		can be used to discontinue watching this property:
		//		|	var watchHandle = obj.watch("foo", callback);
		//		|	watchHandle.unwatch(); // callback won't be called now
		//	callback:
		//		The function to execute when the property changes. This will be called after
		//		the property has been changed. The callback will be called with the |this|
		//		set to the instance, the first argument as the name of the property, the
		// 		second argument as the old value and the third argument as the new value.
		
		var callbacks = this._watchCallbacks;
		if(!callbacks){
			var self = this;
			callbacks = this._watchCallbacks = function(name, oldValue, value, ignoreCatchall){
				var notify = function(propertyCallbacks){
					if(propertyCallbacks){
                        propertyCallbacks = propertyCallbacks.slice();
						for(var i = 0, l = propertyCallbacks.length; i < l; i++){
							try{
								propertyCallbacks[i].call(self, name, oldValue, value);
							}catch(e){
								console.error(e);
							}
						}
					}
				};
				notify(callbacks['_' + name]);
				if(!ignoreCatchall){
					notify(callbacks["*"]); // the catch-all
				}
			}; // we use a function instead of an object so it will be ignored by JSON conversion
		}
		if(!callback && typeof name === "function"){
			callback = name;
			name = "*";
		}else{
			// prepend with dash to prevent name conflicts with function (like "name" property)
			name = '_' + name;
		}
		var propertyCallbacks = callbacks[name];
		if(typeof propertyCallbacks !== "object"){
			propertyCallbacks = callbacks[name] = [];
		}
		propertyCallbacks.push(callback);
		return {
			unwatch: function(){
				propertyCallbacks.splice(dojo.indexOf(propertyCallbacks, callback), 1);
			}
		};
	}
	
});

}

if(!dojo._hasResource["dijit._WidgetBase"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._WidgetBase"] = true;
dojo.provide("dijit._WidgetBase");




(function(){

dojo.declare("dijit._WidgetBase", dojo.Stateful, {
	// summary:
	//		Future base class for all Dijit widgets.
	//		_Widget extends this class adding support for various features needed by desktop.

	// id: [const] String
	//		A unique, opaque ID string that can be assigned by users or by the
	//		system. If the developer passes an ID which is known not to be
	//		unique, the specified ID is ignored and the system-generated ID is
	//		used instead.
	id: "",

	// lang: [const] String
	//		Rarely used.  Overrides the default Dojo locale used to render this widget,
	//		as defined by the [HTML LANG](http://www.w3.org/TR/html401/struct/dirlang.html#adef-lang) attribute.
	//		Value must be among the list of locales specified during by the Dojo bootstrap,
	//		formatted according to [RFC 3066](http://www.ietf.org/rfc/rfc3066.txt) (like en-us).
	lang: "",

	// dir: [const] String
	//		Bi-directional support, as defined by the [HTML DIR](http://www.w3.org/TR/html401/struct/dirlang.html#adef-dir)
	//		attribute. Either left-to-right "ltr" or right-to-left "rtl".  If undefined, widgets renders in page's
	//		default direction.
	dir: "",

	// class: String
	//		HTML class attribute
	"class": "",

	// style: String||Object
	//		HTML style attributes as cssText string or name/value hash
	style: "",

	// title: String
	//		HTML title attribute.
	//
	//		For form widgets this specifies a tooltip to display when hovering over
	//		the widget (just like the native HTML title attribute).
	//
	//		For TitlePane or for when this widget is a child of a TabContainer, AccordionContainer,
	//		etc., it's used to specify the tab label, accordion pane title, etc.
	title: "",

	// tooltip: String
	//		When this widget's title attribute is used to for a tab label, accordion pane title, etc.,
	//		this specifies the tooltip to appear when the mouse is hovered over that text.
	tooltip: "",

	// baseClass: [protected] String
	//		Root CSS class of the widget (ex: dijitTextBox), used to construct CSS classes to indicate
	//		widget state.
	baseClass: "",

	// srcNodeRef: [readonly] DomNode
	//		pointer to original DOM node
	srcNodeRef: null,

	// domNode: [readonly] DomNode
	//		This is our visible representation of the widget! Other DOM
	//		Nodes may by assigned to other properties, usually through the
	//		template system's dojoAttachPoint syntax, but the domNode
	//		property is the canonical "top level" node in widget UI.
	domNode: null,

	// containerNode: [readonly] DomNode
	//		Designates where children of the source DOM node will be placed.
	//		"Children" in this case refers to both DOM nodes and widgets.
	//		For example, for myWidget:
	//
	//		|	<div dojoType=myWidget>
	//		|		<b> here's a plain DOM node
	//		|		<span dojoType=subWidget>and a widget</span>
	//		|		<i> and another plain DOM node </i>
	//		|	</div>
	//
	//		containerNode would point to:
	//
	//		|		<b> here's a plain DOM node
	//		|		<span dojoType=subWidget>and a widget</span>
	//		|		<i> and another plain DOM node </i>
	//
	//		In templated widgets, "containerNode" is set via a
	//		dojoAttachPoint assignment.
	//
	//		containerNode must be defined for any widget that accepts innerHTML
	//		(like ContentPane or BorderContainer or even Button), and conversely
	//		is null for widgets that don't, like TextBox.
	containerNode: null,

/*=====
	// _started: Boolean
	//		startup() has completed.
	_started: false,
=====*/

	// attributeMap: [protected] Object
	//		attributeMap sets up a "binding" between attributes (aka properties)
	//		of the widget and the widget's DOM.
	//		Changes to widget attributes listed in attributeMap will be
	//		reflected into the DOM.
	//
	//		For example, calling set('title', 'hello')
	//		on a TitlePane will automatically cause the TitlePane's DOM to update
	//		with the new title.
	//
	//		attributeMap is a hash where the key is an attribute of the widget,
	//		and the value reflects a binding to a:
	//
	//		- DOM node attribute
	// |		focus: {node: "focusNode", type: "attribute"}
	// 		Maps this.focus to this.focusNode.focus
	//
	//		- DOM node innerHTML
	//	|		title: { node: "titleNode", type: "innerHTML" }
	//		Maps this.title to this.titleNode.innerHTML
	//
	//		- DOM node innerText
	//	|		title: { node: "titleNode", type: "innerText" }
	//		Maps this.title to this.titleNode.innerText
	//
	//		- DOM node CSS class
	// |		myClass: { node: "domNode", type: "class" }
	//		Maps this.myClass to this.domNode.className
	//
	//		If the value is an array, then each element in the array matches one of the
	//		formats of the above list.
	//
	//		There are also some shorthands for backwards compatibility:
	//		- string --> { node: string, type: "attribute" }, for example:
	//	|	"focusNode" ---> { node: "focusNode", type: "attribute" }
	//		- "" --> { node: "domNode", type: "attribute" }
	attributeMap: {id:"", dir:"", lang:"", "class":"", style:"", title:""},

	// _blankGif: [protected] String
	//		Path to a blank 1x1 image.
	//		Used by <img> nodes in templates that really get their image via CSS background-image.
	_blankGif: (dojo.config.blankGif || dojo.moduleUrl("dojo", "resources/blank.gif")).toString(),

	//////////// INITIALIZATION METHODS ///////////////////////////////////////

	postscript: function(/*Object?*/params, /*DomNode|String*/srcNodeRef){
		// summary:
		//		Kicks off widget instantiation.  See create() for details.
		// tags:
		//		private
		this.create(params, srcNodeRef);
	},

	create: function(/*Object?*/params, /*DomNode|String?*/srcNodeRef){
		// summary:
		//		Kick off the life-cycle of a widget
		// params:
		//		Hash of initialization parameters for widget, including
		//		scalar values (like title, duration etc.) and functions,
		//		typically callbacks like onClick.
		// srcNodeRef:
		//		If a srcNodeRef (DOM node) is specified:
		//			- use srcNodeRef.innerHTML as my contents
		//			- if this is a behavioral widget then apply behavior
		//			  to that srcNodeRef
		//			- otherwise, replace srcNodeRef with my generated DOM
		//			  tree
		// description:
		//		Create calls a number of widget methods (postMixInProperties, buildRendering, postCreate,
		//		etc.), some of which of you'll want to override. See http://docs.dojocampus.org/dijit/_Widget
		//		for a discussion of the widget creation lifecycle.
		//
		//		Of course, adventurous developers could override create entirely, but this should
		//		only be done as a last resort.
		// tags:
		//		private

		// store pointer to original DOM tree
		this.srcNodeRef = dojo.byId(srcNodeRef);

		// For garbage collection.  An array of handles returned by Widget.connect()
		// Each handle returned from Widget.connect() is an array of handles from dojo.connect()
		this._connects = [];

		// For garbage collection.  An array of handles returned by Widget.subscribe()
		// The handle returned from Widget.subscribe() is the handle returned from dojo.subscribe()
		this._subscribes = [];

		// mix in our passed parameters
		if(this.srcNodeRef && (typeof this.srcNodeRef.id == "string")){ this.id = this.srcNodeRef.id; }
		if(params){
			this.params = params;
			dojo._mixin(this, params);
		}
		this.postMixInProperties();

		// generate an id for the widget if one wasn't specified
		// (be sure to do this before buildRendering() because that function might
		// expect the id to be there.)
		if(!this.id){
			this.id = dijit.getUniqueId(this.declaredClass.replace(/\./g,"_"));
		}
		dijit.registry.add(this);

		this.buildRendering();

		if(this.domNode){
			// Copy attributes listed in attributeMap into the [newly created] DOM for the widget.
			// Also calls custom setters for all attributes with custom setters.
			this._applyAttributes();

			// If srcNodeRef was specified, then swap out original srcNode for this widget's DOM tree.
			// For 2.0, move this after postCreate().  postCreate() shouldn't depend on the
			// widget being attached to the DOM since it isn't when a widget is created programmatically like
			// new MyWidget({}).   See #11635.
			var source = this.srcNodeRef;
			if(source && source.parentNode && this.domNode !== source){
				source.parentNode.replaceChild(this.domNode, source);
			}
		}

		if(this.domNode){
			// Note: for 2.0 may want to rename widgetId to dojo._scopeName + "_widgetId",
			// assuming that dojo._scopeName even exists in 2.0
			this.domNode.setAttribute("widgetId", this.id);
		}
		this.postCreate();

		// If srcNodeRef has been processed and removed from the DOM (e.g. TemplatedWidget) then delete it to allow GC.
		if(this.srcNodeRef && !this.srcNodeRef.parentNode){
			delete this.srcNodeRef;
		}

		this._created = true;
	},

	_applyAttributes: function(){
		// summary:
		//		Step during widget creation to copy all widget attributes to the
		//		DOM as per attributeMap and _setXXXAttr functions.
		// description:
		//		Skips over blank/false attribute values, unless they were explicitly specified
		//		as parameters to the widget, since those are the default anyway,
		//		and setting tabIndex="" is different than not setting tabIndex at all.
		//
		//		It processes the attributes in the attribute map first, and then
		//		it goes through and processes the attributes for the _setXXXAttr
		//		functions that have been specified
		// tags:
		//		private
		var condAttrApply = function(attr, scope){
			if((scope.params && attr in scope.params) || scope[attr]){
				scope.set(attr, scope[attr]);
			}
		};

		// Do the attributes in attributeMap
		for(var attr in this.attributeMap){
			condAttrApply(attr, this);
		}

		// And also any attributes with custom setters
		dojo.forEach(this._getSetterAttributes(), function(a){
			if(!(a in this.attributeMap)){
				condAttrApply(a, this);
			}
		}, this);
	},

	_getSetterAttributes: function(){
		// summary:
		//		Returns list of attributes with custom setters for this widget
		var ctor = this.constructor;
		if(!ctor._setterAttrs){
			var r = (ctor._setterAttrs = []),
				attrs,
				proto = ctor.prototype;
			for(var fxName in proto){
				if(dojo.isFunction(proto[fxName]) && (attrs = fxName.match(/^_set([a-zA-Z]*)Attr$/)) && attrs[1]){
					r.push(attrs[1].charAt(0).toLowerCase() + attrs[1].substr(1));
				}
			}
		}
		return ctor._setterAttrs;	// String[]
	},

	postMixInProperties: function(){
		// summary:
		//		Called after the parameters to the widget have been read-in,
		//		but before the widget template is instantiated. Especially
		//		useful to set properties that are referenced in the widget
		//		template.
		// tags:
		//		protected
	},

	buildRendering: function(){
		// summary:
		//		Construct the UI for this widget, setting this.domNode
		// description:
		//		Most widgets will mixin `dijit._Templated`, which implements this
		//		method.
		// tags:
		//		protected

		if(!this.domNode){
			// Create root node if it wasn't created by _Templated
			this.domNode = this.srcNodeRef || dojo.create('div');
		}

		// baseClass is a single class name or occasionally a space-separated list of names.
		// Add those classes to the DOMNode.  If RTL mode then also add with Rtl suffix.
		// TODO: make baseClass custom setter
		if(this.baseClass){
			var classes = this.baseClass.split(" ");
			if(!this.isLeftToRight()){
				classes = classes.concat( dojo.map(classes, function(name){ return name+"Rtl"; }));
			}
			dojo.addClass(this.domNode, classes);
		}
	},

	postCreate: function(){
		// summary:
		//		Processing after the DOM fragment is created
		// description:
		//		Called after the DOM fragment has been created, but not necessarily
		//		added to the document.  Do not include any operations which rely on
		//		node dimensions or placement.
		// tags:
		//		protected
	},

	startup: function(){
		// summary:
		//		Processing after the DOM fragment is added to the document
		// description:
		//		Called after a widget and its children have been created and added to the page,
		//		and all related widgets have finished their create() cycle, up through postCreate().
		//		This is useful for composite widgets that need to control or layout sub-widgets.
		//		Many layout widgets can use this as a wiring phase.
		this._started = true;
	},

	//////////// DESTROY FUNCTIONS ////////////////////////////////

	destroyRecursive: function(/*Boolean?*/ preserveDom){
		// summary:
		// 		Destroy this widget and its descendants
		// description:
		//		This is the generic "destructor" function that all widget users
		// 		should call to cleanly discard with a widget. Once a widget is
		// 		destroyed, it is removed from the manager object.
		// preserveDom:
		//		If true, this method will leave the original DOM structure
		//		alone of descendant Widgets. Note: This will NOT work with
		//		dijit._Templated widgets.

		this._beingDestroyed = true;
		this.destroyDescendants(preserveDom);
		this.destroy(preserveDom);
	},

	destroy: function(/*Boolean*/ preserveDom){
		// summary:
		// 		Destroy this widget, but not its descendants.
		//		This method will, however, destroy internal widgets such as those used within a template.
		// preserveDom: Boolean
		//		If true, this method will leave the original DOM structure alone.
		//		Note: This will not yet work with _Templated widgets

		this._beingDestroyed = true;
		this.uninitialize();
		var d = dojo,
			dfe = d.forEach,
			dun = d.unsubscribe;
		dfe(this._connects, function(array){
			dfe(array, d.disconnect);
		});
		dfe(this._subscribes, function(handle){
			dun(handle);
		});

		// destroy widgets created as part of template, etc.
		dfe(this._supportingWidgets || [], function(w){
			if(w.destroyRecursive){
				w.destroyRecursive();
			}else if(w.destroy){
				w.destroy();
			}
		});

		this.destroyRendering(preserveDom);
		dijit.registry.remove(this.id);
		this._destroyed = true;
	},

	destroyRendering: function(/*Boolean?*/ preserveDom){
		// summary:
		//		Destroys the DOM nodes associated with this widget
		// preserveDom:
		//		If true, this method will leave the original DOM structure alone
		//		during tear-down. Note: this will not work with _Templated
		//		widgets yet.
		// tags:
		//		protected

		if(this.bgIframe){
			this.bgIframe.destroy(preserveDom);
			delete this.bgIframe;
		}

		if(this.domNode){
			if(preserveDom){
				dojo.removeAttr(this.domNode, "widgetId");
			}else{
				dojo.destroy(this.domNode);
			}
			delete this.domNode;
		}

		if(this.srcNodeRef){
			if(!preserveDom){
				dojo.destroy(this.srcNodeRef);
			}
			delete this.srcNodeRef;
		}
	},

	destroyDescendants: function(/*Boolean?*/ preserveDom){
		// summary:
		//		Recursively destroy the children of this widget and their
		//		descendants.
		// preserveDom:
		//		If true, the preserveDom attribute is passed to all descendant
		//		widget's .destroy() method. Not for use with _Templated
		//		widgets.

		// get all direct descendants and destroy them recursively
		dojo.forEach(this.getChildren(), function(widget){
			if(widget.destroyRecursive){
				widget.destroyRecursive(preserveDom);
			}
		});
	},

	uninitialize: function(){
		// summary:
		//		Stub function. Override to implement custom widget tear-down
		//		behavior.
		// tags:
		//		protected
		return false;
	},

	////////////////// GET/SET, CUSTOM SETTERS, ETC. ///////////////////

	_setClassAttr: function(/*String*/ value){
		// summary:
		//		Custom setter for the CSS "class" attribute
		// tags:
		//		protected
		var mapNode = this[this.attributeMap["class"] || 'domNode'];
		dojo.replaceClass(mapNode, value, this["class"]);
		this._set("class", value);
	},

	_setStyleAttr: function(/*String||Object*/ value){
		// summary:
		//		Sets the style attribute of the widget according to value,
		//		which is either a hash like {height: "5px", width: "3px"}
		//		or a plain string
		// description:
		//		Determines which node to set the style on based on style setting
		//		in attributeMap.
		// tags:
		//		protected

		var mapNode = this[this.attributeMap.style || 'domNode'];

		// Note: technically we should revert any style setting made in a previous call
		// to his method, but that's difficult to keep track of.

		if(dojo.isObject(value)){
			dojo.style(mapNode, value);
		}else{
			if(mapNode.style.cssText){
				mapNode.style.cssText += "; " + value;
			}else{
				mapNode.style.cssText = value;
			}
		}

		this._set("style", value);
	},

	_attrToDom: function(/*String*/ attr, /*String*/ value){
		// summary:
		//		Reflect a widget attribute (title, tabIndex, duration etc.) to
		//		the widget DOM, as specified in attributeMap.
		//		Note some attributes like "type"
		//		cannot be processed this way as they are not mutable.
		//
		// tags:
		//		private

		var commands = this.attributeMap[attr];
		dojo.forEach(dojo.isArray(commands) ? commands : [commands], function(command){

			// Get target node and what we are doing to that node
			var mapNode = this[command.node || command || "domNode"];	// DOM node
			var type = command.type || "attribute";	// class, innerHTML, innerText, or attribute

			switch(type){
				case "attribute":
					if(dojo.isFunction(value)){ // functions execute in the context of the widget
						value = dojo.hitch(this, value);
					}

					// Get the name of the DOM node attribute; usually it's the same
					// as the name of the attribute in the widget (attr), but can be overridden.
					// Also maps handler names to lowercase, like onSubmit --> onsubmit
					var attrName = command.attribute ? command.attribute :
						(/^on[A-Z][a-zA-Z]*$/.test(attr) ? attr.toLowerCase() : attr);

					dojo.attr(mapNode, attrName, value);
					break;
				case "innerText":
					mapNode.innerHTML = "";
					mapNode.appendChild(dojo.doc.createTextNode(value));
					break;
				case "innerHTML":
					mapNode.innerHTML = value;
					break;
				case "class":
					dojo.replaceClass(mapNode, value, this[attr]);
					break;
			}
		}, this);
	},

	get: function(name){
		// summary:
		//		Get a property from a widget.
		//	name:
		//		The property to get.
		// description:
		//		Get a named property from a widget. The property may
		//		potentially be retrieved via a getter method. If no getter is defined, this
		// 		just retrieves the object's property.
		// 		For example, if the widget has a properties "foo"
		//		and "bar" and a method named "_getFooAttr", calling:
		//	|	myWidget.get("foo");
		//		would be equivalent to writing:
		//	|	widget._getFooAttr();
		//		and:
		//	|	myWidget.get("bar");
		//		would be equivalent to writing:
		//	|	widget.bar;
		var names = this._getAttrNames(name);
		return this[names.g] ? this[names.g]() : this[name];
	},
	
	set: function(name, value){
		// summary:
		//		Set a property on a widget
		//	name:
		//		The property to set.
		//	value:
		//		The value to set in the property.
		// description:
		//		Sets named properties on a widget which may potentially be handled by a
		// 		setter in the widget.
		// 		For example, if the widget has a properties "foo"
		//		and "bar" and a method named "_setFooAttr", calling:
		//	|	myWidget.set("foo", "Howdy!");
		//		would be equivalent to writing:
		//	|	widget._setFooAttr("Howdy!");
		//		and:
		//	|	myWidget.set("bar", 3);
		//		would be equivalent to writing:
		//	|	widget.bar = 3;
		//
		//	set() may also be called with a hash of name/value pairs, ex:
		//	|	myWidget.set({
		//	|		foo: "Howdy",
		//	|		bar: 3
		//	|	})
		//	This is equivalent to calling set(foo, "Howdy") and set(bar, 3)

		if(typeof name === "object"){
			for(var x in name){
				this.set(x, name[x]);
			}
			return this;
		}
		var names = this._getAttrNames(name);
		if(this[names.s]){
			// use the explicit setter
			var result = this[names.s].apply(this, Array.prototype.slice.call(arguments, 1));
		}else{
			// if param is specified as DOM node attribute, copy it
			if(name in this.attributeMap){
				this._attrToDom(name, value);
			}
			this._set(name, value);
		}
		return result || this;
	},
	
	_attrPairNames: {},		// shared between all widgets
	_getAttrNames: function(name){
		// summary:
		//		Helper function for get() and set().
		//		Caches attribute name values so we don't do the string ops every time.
		// tags:
		//		private

		var apn = this._attrPairNames;
		if(apn[name]){ return apn[name]; }
		var uc = name.charAt(0).toUpperCase() + name.substr(1);
		return (apn[name] = {
			n: name+"Node",
			s: "_set"+uc+"Attr",
			g: "_get"+uc+"Attr"
		});
	},

	_set: function(/*String*/ name, /*anything*/ value){
		// summary:
		//		Helper function to set new value for specified attribute, and call handlers
		//		registered with watch() if the value has changed.
		var oldValue = this[name];
		this[name] = value;
		if(this._watchCallbacks && this._created && value !== oldValue){
			this._watchCallbacks(name, oldValue, value);
		}
	},

	toString: function(){
		// summary:
		//		Returns a string that represents the widget
		// description:
		//		When a widget is cast to a string, this method will be used to generate the
		//		output. Currently, it does not implement any sort of reversible
		//		serialization.
		return '[Widget ' + this.declaredClass + ', ' + (this.id || 'NO ID') + ']'; // String
	},

	getDescendants: function(){
		// summary:
		//		Returns all the widgets contained by this, i.e., all widgets underneath this.containerNode.
		//		This method should generally be avoided as it returns widgets declared in templates, which are
		//		supposed to be internal/hidden, but it's left here for back-compat reasons.

		return this.containerNode ? dojo.query('[widgetId]', this.containerNode).map(dijit.byNode) : []; // dijit._Widget[]
	},

	getChildren: function(){
		// summary:
		//		Returns all the widgets contained by this, i.e., all widgets underneath this.containerNode.
		//		Does not return nested widgets, nor widgets that are part of this widget's template.
		return this.containerNode ? dijit.findWidgets(this.containerNode) : []; // dijit._Widget[]
	},

	connect: function(
			/*Object|null*/ obj,
			/*String|Function*/ event,
			/*String|Function*/ method){
		// summary:
		//		Connects specified obj/event to specified method of this object
		//		and registers for disconnect() on widget destroy.
		// description:
		//		Provide widget-specific analog to dojo.connect, except with the
		//		implicit use of this widget as the target object.
		//		Events connected with `this.connect` are disconnected upon
		//		destruction.
		// returns:
		//		A handle that can be passed to `disconnect` in order to disconnect before
		//		the widget is destroyed.
		// example:
		//	|	var btn = new dijit.form.Button();
		//	|	// when foo.bar() is called, call the listener we're going to
		//	|	// provide in the scope of btn
		//	|	btn.connect(foo, "bar", function(){
		//	|		console.debug(this.toString());
		//	|	});
		// tags:
		//		protected

		var handles = [dojo._connect(obj, event, this, method)];
		this._connects.push(handles);
		return handles;		// _Widget.Handle
	},

	disconnect: function(/* _Widget.Handle */ handles){
		// summary:
		//		Disconnects handle created by `connect`.
		//		Also removes handle from this widget's list of connects.
		// tags:
		//		protected
		for(var i=0; i<this._connects.length; i++){
			if(this._connects[i] == handles){
				dojo.forEach(handles, dojo.disconnect);
				this._connects.splice(i, 1);
				return;
			}
		}
	},

	subscribe: function(
			/*String*/ topic,
			/*String|Function*/ method){
		// summary:
		//		Subscribes to the specified topic and calls the specified method
		//		of this object and registers for unsubscribe() on widget destroy.
		// description:
		//		Provide widget-specific analog to dojo.subscribe, except with the
		//		implicit use of this widget as the target object.
		// example:
		//	|	var btn = new dijit.form.Button();
		//	|	// when /my/topic is published, this button changes its label to
		//	|   // be the parameter of the topic.
		//	|	btn.subscribe("/my/topic", function(v){
		//	|		this.set("label", v);
		//	|	});
		var handle = dojo.subscribe(topic, this, method);

		// return handles for Any widget that may need them
		this._subscribes.push(handle);
		return handle;
	},

	unsubscribe: function(/*Object*/ handle){
		// summary:
		//		Unsubscribes handle created by this.subscribe.
		//		Also removes handle from this widget's list of subscriptions
		for(var i=0; i<this._subscribes.length; i++){
			if(this._subscribes[i] == handle){
				dojo.unsubscribe(handle);
				this._subscribes.splice(i, 1);
				return;
			}
		}
	},

	isLeftToRight: function(){
		// summary:
		//		Return this widget's explicit or implicit orientation (true for LTR, false for RTL)
		// tags:
		//		protected
		return this.dir ? (this.dir == "ltr") : dojo._isBodyLtr(); //Boolean
	},

	placeAt: function(/* String|DomNode|_Widget */reference, /* String?|Int? */position){
		// summary:
		//		Place this widget's domNode reference somewhere in the DOM based
		//		on standard dojo.place conventions, or passing a Widget reference that
		//		contains and addChild member.
		//
		// description:
		//		A convenience function provided in all _Widgets, providing a simple
		//		shorthand mechanism to put an existing (or newly created) Widget
		//		somewhere in the dom, and allow chaining.
		//
		// reference:
		//		The String id of a domNode, a domNode reference, or a reference to a Widget posessing
		//		an addChild method.
		//
		// position:
		//		If passed a string or domNode reference, the position argument
		//		accepts a string just as dojo.place does, one of: "first", "last",
		//		"before", or "after".
		//
		//		If passed a _Widget reference, and that widget reference has an ".addChild" method,
		//		it will be called passing this widget instance into that method, supplying the optional
		//		position index passed.
		//
		// returns:
		//		dijit._Widget
		//		Provides a useful return of the newly created dijit._Widget instance so you
		//		can "chain" this function by instantiating, placing, then saving the return value
		//		to a variable.
		//
		// example:
		// | 	// create a Button with no srcNodeRef, and place it in the body:
		// | 	var button = new dijit.form.Button({ label:"click" }).placeAt(dojo.body());
		// | 	// now, 'button' is still the widget reference to the newly created button
		// | 	dojo.connect(button, "onClick", function(e){ console.log('click'); });
		//
		// example:
		// |	// create a button out of a node with id="src" and append it to id="wrapper":
		// | 	var button = new dijit.form.Button({},"src").placeAt("wrapper");
		//
		// example:
		// |	// place a new button as the first element of some div
		// |	var button = new dijit.form.Button({ label:"click" }).placeAt("wrapper","first");
		//
		// example:
		// |	// create a contentpane and add it to a TabContainer
		// |	var tc = dijit.byId("myTabs");
		// |	new dijit.layout.ContentPane({ href:"foo.html", title:"Wow!" }).placeAt(tc)

		if(reference.declaredClass && reference.addChild){
			reference.addChild(this, position);
		}else{
			dojo.place(this.domNode, reference, position);
		}
		return this;
	}
});

})();

}

if(!dojo._hasResource["dojox.mobile._base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile._base"] = true;
dojo.provide("dojox.mobile._base");


dojo.isBB = (navigator.userAgent.indexOf("BlackBerry") != -1) && !dojo.isWebKit;

// summary:
//		Mobile Widgets
// description:
//		This module provides a number of widgets that can be used to build
//		web-based applications for mobile devices such as iPhone or Android.
//		These widgets work best with webkit-based browsers, such as Safari or
//		Chrome, since webkit-specific CSS3 features are used.
//		However, the widgets should work in a "graceful degradation" manner
//		even on non-CSS3 browsers, such as IE or Firefox. In that case,
//		fancy effects, such as animation, gradient color, or round corner
//		rectangle, may not work, but you can still operate your application.
//
//		Furthermore, as a separate file, a compatibility module,
//		dojox.mobile.compat, is available that simulates some of CSS3 features
//		used in this module. If you use the compatibility module, fancy visual
//		effects work better even on non-CSS3 browsers.
//
//		Note that use of dijit._Container, dijit._Contained, dijit._Templated,
//		and dojo.query is intentionally avoided to reduce download code size.

dojo.declare(
	"dojox.mobile.View",
	dijit._WidgetBase,
{
	// summary:
	//		A widget that represents a view that occupies the full screen
	// description:
	//		View acts as a container for any HTML and/or widgets. An entire HTML page
	//		can have multiple View widgets and the user can navigate through
	//		the views back and forth without page transitions.

	// selected: Boolean
	//		If true, the view is displayed at startup time.
	selected: false,

	// keepScrollPos: Boolean
	//		If true, the scroll position is kept between views.
	keepScrollPos: true,

	_started: false,

	constructor: function(params, node){
		if(node){
			dojo.byId(node).style.visibility = "hidden";
		}
	},

	buildRendering: function(){
		this.domNode = this.containerNode = this.srcNodeRef || dojo.doc.createElement("DIV");
		this.domNode.className = "mblView";
		this.connect(this.domNode, "webkitAnimationEnd", "onAnimationEnd");
		this.connect(this.domNode, "webkitAnimationStart", "onAnimationStart");
		var id = location.href.match(/#(\w+)([^\w=]|$)/) ? RegExp.$1 : null;

		this._visible = this.selected && !id || this.id == id;

		if(this.selected){
			dojox.mobile._defaultView = this;
		}
	},

	startup: function(){
		if(this._started){ return; }
		var _this = this;
		setTimeout(function(){
			if(!_this._visible){
				_this.domNode.style.display = "none";
			}else{
				dojox.mobile.currentView = _this;
				_this.onStartView();
			}
			_this.domNode.style.visibility = "visible";
		}, dojo.isIE?100:0); // give IE a little time to complete drawing
		this._started = true;
	},

	onStartView: function(){
		// Stub function to connect to from your application.
		// Called only when this view is shown at startup time.
	},

	onBeforeTransitionIn: function(moveTo, dir, transition, context, method){
		// Stub function to connect to from your application.
	},

	onAfterTransitionIn: function(moveTo, dir, transition, context, method){
		// Stub function to connect to from your application.
	},

	onBeforeTransitionOut: function(moveTo, dir, transition, context, method){
		// Stub function to connect to from your application.
	},

	onAfterTransitionOut: function(moveTo, dir, transition, context, method){
		// Stub function to connect to from your application.
	},

	_saveState: function(moveTo, dir, transition, context, method){
		this._context = context;
		this._method = method;
		if(transition == "none" || !dojo.isWebKit){
			transition = null;
		}
		this._moveTo = moveTo;
		this._dir = dir;
		this._transition = transition;
		this._arguments = [];
		var i;
		for(i = 0; i < arguments.length; i++){
			this._arguments.push(arguments[i]);
		}
		this._args = [];
		if(context || method){
			for(i = 5; i < arguments.length; i++){
				this._args.push(arguments[i]);
			}
		}
	},

	performTransition: function(/*String*/moveTo, /*Number*/dir, /*String*/transition,
								/*Object|null*/context, /*String|Function*/method /*optional args*/){
		// summary:
		//		Function to perform the various types of view transitions, such as fade, slide, and flip.
		// moveTo: String
		//		The destination view id to transition the current view to.
		//		If null, transitions to a blank view.
		// dir: Number
		//		The transition direction. If 1, transition forward. If -1, transition backward.
		//		For example, the slide transition slides the view from right to left when dir == 1,
		//		and from left to right when dir == -1.
		// transision: String
		//		The type of transition to perform. "slide", "fade", or "flip"
		// context: Object
		//		The object that the callback function will receive as "this".
		// method: String|Function
		//		A callback function that is called when the transition has been finished.
		//		A function reference, or name of a function in context.
		// tags:
		//		public
		// example:
		//		Transitions to the blank view, and then opens another page.
		//	|	performTransition(null, 1, "slide", null, function(){location.href = href;});
		if(dojo.hash){
			if(typeof(moveTo) == "string" && moveTo.charAt(0) == '#' && !dojox.mobile._params){
				dojox.mobile._params = [];
				for(var i = 0; i < arguments.length; i++){
					dojox.mobile._params.push(arguments[i]);
				}
				dojo.hash(moveTo);
				return;
			}
		}
		this._saveState.apply(this, arguments);
		var toNode;
		if(moveTo){
			if(typeof(moveTo) == "string"){
				// removes a leading hash mark (#) and params if exists
				// ex. "#bar&myParam=0003" -> "bar"
				moveTo.match(/^#?([^&]+)/);
				toNode = RegExp.$1;
			}else{
				toNode = moveTo;
			}
		}else{
			if(!this._dummyNode){
				this._dummyNode = dojo.doc.createElement("DIV");
				dojo.body().appendChild(this._dummyNode);
			}
			toNode = this._dummyNode;
		}
		var fromNode = this.domNode;
		toNode = this.toNode = dojo.byId(toNode);
		if(!toNode){ alert("dojox.mobile.View#performTransition: destination view not found: "+toNode); }
		toNode.style.visibility = "hidden";
		toNode.style.display = "";
		this.onBeforeTransitionOut.apply(this, arguments);
		var toWidget = dijit.byNode(toNode);
		if(toWidget){
			// perform view transition keeping the scroll position
			if(this.keepScrollPos && !dijit.getEnclosingWidget(this.domNode.parentNode)){
				var scrollTop = dojo.body().scrollTop || dojo.doc.documentElement.scrollTop || dojo.global.pageYOffset || 0;
				if(dir == 1){
					toNode.style.top = "0px";
					if(scrollTop > 1){
						fromNode.style.top = -scrollTop + "px";
						if(dojo.config["mblHideAddressBar"] !== false){
							setTimeout(function(){ // iPhone needs setTimeout
								dojo.global.scrollTo(0, 1);
							}, 0);
						}
					}
				}else{
					if(scrollTop > 1 || toNode.offsetTop !== 0){
						var toTop = -toNode.offsetTop;
						toNode.style.top = "0px";
						fromNode.style.top = toTop - scrollTop + "px";
						if(dojo.config["mblHideAddressBar"] !== false && toTop > 0){
							setTimeout(function(){ // iPhone needs setTimeout
								dojo.global.scrollTo(0, toTop + 1);
							}, 0);
						}
					}
				}
			}else{
				toNode.style.top = "0px";
			}
			toWidget.onBeforeTransitionIn.apply(toWidget, arguments);
		}
		toNode.style.display = "none";
		toNode.style.visibility = "visible";
		this._doTransition(fromNode, toNode, transition, dir);
	},

	_doTransition: function(fromNode, toNode, transition, dir){
		var rev = (dir == -1) ? " reverse" : "";
		toNode.style.display = "";
		if(!transition || transition == "none"){
			this.domNode.style.display = "none";
			this.invokeCallback();
		}else{
			dojo.addClass(fromNode, transition + " out" + rev);
			dojo.addClass(toNode, transition + " in" + rev);
		}
	},

	onAnimationStart: function(e){
	},

	onAnimationEnd: function(e){
		var isOut = false;
		if(dojo.hasClass(this.domNode, "out")){
			isOut = true;
			this.domNode.style.display = "none";
			dojo.forEach([this._transition,"in","out","reverse"], function(s){
				dojo.removeClass(this.domNode, s);
			}, this);
		}
		if(e.animationName.indexOf("shrink") === 0){
			var li = e.target;
			li.style.display = "none";
			dojo.removeClass(li, "mblCloseContent");
		}
		if(isOut){
			this.invokeCallback();
		}
		// this.domNode may be destroyed as a result of invoking the callback,
		// so check for that before accessing it.
		this.domNode && (this.domNode.className = "mblView");
	},

	invokeCallback: function(){
		this.onAfterTransitionOut.apply(this, this._arguments);
		var toWidget = dijit.byNode(this.toNode);
		if(toWidget){
			toWidget.onAfterTransitionIn.apply(toWidget, this._arguments);
		}

		dojox.mobile.currentView = toWidget;

		var c = this._context, m = this._method;
		if(!c && !m){ return; }
		if(!m){
			m = c;
			c = null;
		}
		c = c || dojo.global;
		if(typeof(m) == "string"){
			c[m].apply(c, this._args);
		}else{
			m.apply(c, this._args);
		}
	},

	getShowingView: function(){
		// summary:
		//		Find the currently showing view from my sibling views.
		// description:
		//		Note that dojox.mobile.currentView is the last shown view.
		//		If the page consists of a splitter, there are multiple showing views.
		var nodes = this.domNode.parentNode.childNodes;
		for(var i = 0; i < nodes.length; i++){
			if(dojo.hasClass(nodes[i], "mblView") && dojo.style(nodes[i], "display") != "none"){
				return dijit.byNode(nodes[i]);
			}
		}
	},

	show: function(){
		// summary:
		//		Shows this view without a transition animation.
		var fs = this.getShowingView().domNode.style; // from-style
		var ts = this.domNode.style; // to-style
		fs.display = "none";
		ts.display = "";
		dojox.mobile.currentView = this;
	},

	addChild: function(widget){
		this.containerNode.appendChild(widget.domNode);
	}
});

dojo.declare(
	"dojox.mobile.Heading",
	dijit._WidgetBase,
{
	back: "",
	href: "",
	moveTo: "",
	transition: "slide",
	label: "",
	iconBase: "",

	buildRendering: function(){
		this.domNode = this.containerNode = this.srcNodeRef || dojo.doc.createElement("H1");
		this.domNode.className = "mblHeading";
		this._view = dijit.getEnclosingWidget(this.domNode.parentNode); // parentNode is null if created programmatically
		if(this.label){
			this.domNode.appendChild(document.createTextNode(this.label));
		}else{
			this.label = "";
			dojo.forEach(this.domNode.childNodes, function(n){
				if(n.nodeType == 3){ this.label += n.nodeValue; }
			}, this);
			this.label = dojo.trim(this.label);
		}
		if(this.back){
			var btn = dojo.create("DIV", {className:"mblArrowButton"}, this.domNode, "first");
			var head = dojo.create("DIV", {className:"mblArrowButtonHead"}, btn);
			var body = dojo.create("DIV", {className:"mblArrowButtonBody mblArrowButtonText"}, btn);

			this._body = body;
			this._head = head;
			this._btn = btn;
			body.innerHTML = this.back;
			this.connect(body, "onclick", "onClick");
			var neck = dojo.create("DIV", {className:"mblArrowButtonNeck"}, btn);
			btn.style.width = body.offsetWidth + head.offsetWidth + "px";
			this.setLabel(this.label);
		}
	},

	startup: function(){
		if(this._btn){
			this._btn.style.width = this._body.offsetWidth + this._head.offsetWidth + "px";
		}
	},

	onClick: function(e){
		var h1 = this.domNode;
		dojo.addClass(h1, "mblArrowButtonSelected");
		setTimeout(function(){
			dojo.removeClass(h1, "mblArrowButtonSelected");
		}, 1000);
		this.goTo(this.moveTo, this.href);
	},

	setLabel: function(label){
		if(label != this.label){
			this.label = label;
			this.domNode.firstChild.nodeValue = label;
		}
	},

	goTo: function(moveTo, href){
		if(!this._view){
			this._view = dijit.byNode(this.domNode.parentNode);
		}
		if(!this._view){ return; }
		if(href){
			this._view.performTransition(null, -1, this.transition, this, function(){location.href = href;});
		}else{
			if(dojox.mobile.app && dojox.mobile.app.STAGE_CONTROLLER_ACTIVE){
				// If in a full mobile app, then use its mechanisms to move back a scene
				dojo.publish("/dojox/mobile/app/goback");
			}
			else{
				this._view.performTransition(moveTo, -1, this.transition);
			}

		}
	}
});

dojo.declare(
	"dojox.mobile.RoundRect",
	dijit._WidgetBase,
{
	shadow: false,

	buildRendering: function(){
		this.domNode = this.containerNode = this.srcNodeRef || dojo.doc.createElement("DIV");
		this.domNode.className = this.shadow ? "mblRoundRect mblShadow" : "mblRoundRect";
	}
});

dojo.declare(
	"dojox.mobile.RoundRectCategory",
	dijit._WidgetBase,
{
	label: "",

	buildRendering: function(){
		this.domNode = this.containerNode = this.srcNodeRef || dojo.doc.createElement("H2");
		this.domNode.className = "mblRoundRectCategory";
		if(this.label){
			this.domNode.innerHTML = this.label;
		}else{
			this.label = this.domNode.innerHTML;
		}
	}
});

dojo.declare(
	"dojox.mobile.EdgeToEdgeCategory",
	dojox.mobile.RoundRectCategory,
{
	buildRendering: function(){
		this.inherited(arguments);
		this.domNode.className = "mblEdgeToEdgeCategory";
	}
});

dojo.declare(
	"dojox.mobile.RoundRectList",
	dijit._WidgetBase,
{
	transition: "slide",
	iconBase: "",
	iconPos: "",

	buildRendering: function(){
		this.domNode = this.containerNode = this.srcNodeRef || dojo.doc.createElement("UL");
		this.domNode.className = "mblRoundRectList";
	},

	addChild: function(widget){
		this.containerNode.appendChild(widget.domNode);
		widget.inheritParams();
		widget.setIcon();
	}
});

dojo.declare(
	"dojox.mobile.EdgeToEdgeList",
	dojox.mobile.RoundRectList,
{
	stateful: false, // keep the selection state or not
	buildRendering: function(){
		this.inherited(arguments);
		this.domNode.className = "mblEdgeToEdgeList";
	}
});

dojo.declare(
	"dojox.mobile.AbstractItem",
	dijit._WidgetBase,
{
	icon: "",
	iconPos: "", // top,left,width,height (ex. "0,0,29,29")
	href: "",
	hrefTarget: "",
	moveTo: "",
	scene: "",
	clickable: false,
	url: "",
	urlTarget: "", // node id under which a new view is created
	transition: "",
	transitionDir: 1,
	callback: null,
	sync: true,
	label: "",
	toggle: false,
	_duration: 800, // duration of selection, milliseconds

	inheritParams: function(){
		var parent = this.getParentWidget();
		if(parent){
			if(!this.transition){ this.transition = parent.transition; }
			if(!this.icon){ this.icon = parent.iconBase; }
			if(!this.iconPos){ this.iconPos = parent.iconPos; }
		}
	},

	findCurrentView: function(moveTo){
		var w;
		if(moveTo){
			w = dijit.byId(moveTo);
			if(w){ return w.getShowingView(); }
		}
		var n = this.domNode.parentNode;
		while(true){
			w = dijit.getEnclosingWidget(n);
			if(!w){ return null; }
			if(w.performTransition){ break; }
			n = w.domNode.parentNode;
		}
		return w;
	},

	transitionTo: function(moveTo, href, url, scene){
		var w = this.findCurrentView(moveTo); // the current view widget
		if(!w || moveTo && w === dijit.byId(moveTo)){ return; }
		if(href){
			if(this.hrefTarget){
				dojox.mobile.openWindow(this.href, this.hrefTarget);
			}else{
				w.performTransition(null, this.transitionDir, this.transition, this, function(){location.href = href;});
			}
			return;
		} else if(scene){
			dojo.publish("/dojox/mobile/app/pushScene", [scene]);
			return;
		}
		if(url){
			var id;
			if(dojox.mobile._viewMap && dojox.mobile._viewMap[url]){
				// external view has already been loaded
				id = dojox.mobile._viewMap[url];
			}else{
				// get the specified external view and append it to the <body>
				var text = this._text;
				if(!text){
					if(this.sync){
						text = dojo.trim(dojo._getText(url));
					}else{
						dojo["require"]("dojo._base.xhr");
						var prog = dojox.mobile.ProgressIndicator.getInstance();
						dojo.body().appendChild(prog.domNode);
						prog.start();
						var xhr = dojo.xhrGet({
							url: url,
							handleAs: "text"
						});
						xhr.addCallback(dojo.hitch(this, function(response, ioArgs){
							prog.stop();
							if(response){
								this._text = response;
								this.transitionTo(moveTo, href, url, scene);
							}
						}));
						xhr.addErrback(function(error){
							prog.stop();
							alert("Failed to load "+url+"\n"+(error.description||error));
						});
						return;
					}
				}
				this._text = null;
				id = this._parse(text);
				if(!dojox.mobile._viewMap){
					dojox.mobile._viewMap = [];
				}
				dojox.mobile._viewMap[url] = id;
			}
			moveTo = id;
			w = this.findCurrentView(moveTo) || w; // the current view widget
		}
		w.performTransition(moveTo, this.transitionDir, this.transition, this.callback && this, this.callback);
	},

	_parse: function(text){
		var container = dojo.create("DIV");
		var view;
		var id = this.urlTarget;
		var target = dijit.byId(id) && dijit.byId(id).containerNode ||
			dojo.byId(id) ||
			dojox.mobile.currentView && dojox.mobile.currentView.domNode.parentNode ||
			dojo.body();
		if(text.charAt(0) == "<"){ // html markup
			container.innerHTML = text;
			view = container.firstChild; // <div dojoType="dojox.mobile.View">
			if(!view && view.nodeType != 1){
				alert("dojox.mobile.AbstractItem#transitionTo: invalid view content");
				return;
			}
			view.setAttribute("_started", "true"); // to avoid startup() is called
			view.style.visibility = "hidden";
			target.appendChild(container);
			(dojox.mobile.parser || dojo.parser).parse(container);
			target.appendChild(target.removeChild(container).firstChild); // reparent
		}else if(text.charAt(0) == "{"){ // json
			target.appendChild(container);
			this._ws = [];
			view = this._instantiate(eval('('+text+')'), container);
			for(var i = 0; i < this._ws.length; i++){
				var w = this._ws[i];
				w.startup && !w._started && (!w.getParent || !w.getParent()) && w.startup();
			}
			this._ws = null;
		}
		view.style.display = "none";
		view.style.visibility = "visible";
		var id = view.id;
		return dojo.hash ? "#" + id : id;
	},

	_instantiate: function(/*Object*/obj, /*DomNode*/node, /*Widget*/parent){
		var widget;
		for(var key in obj){
			if(key.charAt(0) == "@"){ continue; }
			var cls = dojo.getObject(key);
			if(!cls){ continue; }
			var params = {};
			var proto = cls.prototype;
			var objs = dojo.isArray(obj[key]) ? obj[key] : [obj[key]];
			for(var i = 0; i < objs.length; i++){
				for(var prop in objs[i]){
					if(prop.charAt(0) == "@"){
						var val = objs[i][prop];
						prop = prop.substring(1);
						if(typeof proto[prop] == "string"){
							params[prop] = val;
						}else if(typeof proto[prop] == "number"){
							params[prop] = val - 0;
						}else if(typeof proto[prop] == "boolean"){
							params[prop] = (val != "false");
						}else if(typeof proto[prop] == "object"){
							params[prop] = eval("(" + val + ")");
						}
					}
				}
				widget = new cls(params, node);
				if(!node){ // not to call View's startup()
					this._ws.push(widget);
				}
				if(parent && parent.addChild){
					parent.addChild(widget);
				}
				this._instantiate(objs[i], null, widget);
			}
		}
		return widget && widget.domNode;
	},

	createDomButton: function(/*DomNode*/refNode, /*DomNode?*/toNode){
		var s = refNode.className;
		if(s.match(/mblDomButton\w+_(\d+)/)){
			var nDiv = RegExp.$1 - 0;
			for(var i = 0, p = (toNode||refNode); i < nDiv; i++){
				p = dojo.create("DIV", null, p);
			}
		}
	},

	select: function(/*Boolean?*/deselect){
		// subclass must implement
	},

	defaultClickAction: function(){
		if(this.toggle){
			this.select(this.selected);
		}else if(!this.selected){
			this.select();
			if(!this.selectOne){
				var _this = this;
				setTimeout(function(){
					_this.select(true);
				}, this._duration);
			}
			if(this.moveTo || this.href || this.url || this.scene){
				this.transitionTo(this.moveTo, this.href, this.url, this.scene);
			}
		}
	},

	getParentWidget: function(){
		var ref = this.srcNodeRef || this.domNode;
		return ref && ref.parentNode ? dijit.getEnclosingWidget(ref.parentNode) : null;
	}
});

dojo.declare(
	"dojox.mobile.ListItem",
	dojox.mobile.AbstractItem,
{
	rightText: "",
	btnClass: "",
	anchorLabel: false,
	noArrow: false,
	selected: false,

	buildRendering: function(){
		this.inheritParams();
		var a = this.anchorNode = dojo.create("A");
		a.className = "mblListItemAnchor";
		var box = dojo.create("DIV");
		box.className = "mblListItemTextBox";
		if(this.anchorLabel){
			box.style.cursor = "pointer";
		}
		var r = this.srcNodeRef;
		if(r){
			for(var i = 0, len = r.childNodes.length; i < len; i++){
				box.appendChild(r.removeChild(r.firstChild));
			}
		}
		if(this.label){
			box.appendChild(dojo.doc.createTextNode(this.label));
		}
		a.appendChild(box);
		if(this.rightText){
			this._setRightTextAttr(this.rightText);
		}

		if(this.moveTo || this.href || this.url || this.clickable){
			var parent = this.getParentWidget();
			if(!this.noArrow && !(parent && parent.stateful)){
				var arrow = dojo.create("DIV");
				arrow.className = "mblArrow";
				a.appendChild(arrow);
			}
			this.connect(a, "onclick", "onClick");
		}else if(this.btnClass){
			var div = this.btnNode = dojo.create("DIV");
			div.className = this.btnClass+" mblRightButton";
			div.appendChild(dojo.create("DIV"));
			div.appendChild(dojo.create("P"));

			var dummyDiv = dojo.create("DIV");
			dummyDiv.className = "mblRightButtonContainer";
			dummyDiv.appendChild(div);
			a.appendChild(dummyDiv);
			dojo.addClass(a, "mblListItemAnchorHasRightButton");
			setTimeout(function(){
				dummyDiv.style.width = div.offsetWidth + "px";
				dummyDiv.style.height = div.offsetHeight + "px";
				if(dojo.isIE){
					// IE seems to ignore the height of LI without this..
					a.parentNode.style.height = a.parentNode.offsetHeight + "px";
				}
			}, 0);
		}
		if(this.anchorLabel){
			box.style.display = "inline"; // to narrow the text region
		}
		var li = this.domNode = this.containerNode = this.srcNodeRef || dojo.doc.createElement("LI");
		li.className = "mblListItem" + (this.selected ? " mblItemSelected" : "");
		li.appendChild(a);
		this.setIcon();
	},

	setIcon: function(){
		if(this.iconNode){ return; }
		var a = this.anchorNode;
		if(this.icon && this.icon != "none"){
			var img = this.iconNode = dojo.create("IMG");
			img.className = "mblListItemIcon";
			img.src = this.icon;
			this.domNode.insertBefore(img, a);
			dojox.mobile.setupIcon(this.iconNode, this.iconPos);
			dojo.removeClass(a, "mblListItemAnchorNoIcon");
		}else{
			dojo.addClass(a, "mblListItemAnchorNoIcon");
		}
	},

	onClick: function(e){
		var a = e.currentTarget;
		var li = a.parentNode;
		if(dojo.hasClass(li, "mblItemSelected")){ return; } // already selected
		if(this.anchorLabel){
			for(var p = e.target; p.tagName != "LI"; p = p.parentNode){
				if(p.className == "mblListItemTextBox"){
					dojo.addClass(p, "mblListItemTextBoxSelected");
					setTimeout(function(){
						dojo.removeClass(p, "mblListItemTextBoxSelected");
					}, 1000);
					this.onAnchorLabelClicked(e);
					return;
				}
			}
		}
		if(this.getParentWidget().stateful){
			for(var i = 0, c = li.parentNode.childNodes; i < c.length; i++){
				dojo.removeClass(c[i], "mblItemSelected");
			}
		}else{
			setTimeout(function(){
				dojo.removeClass(li, "mblItemSelected");
			}, 1000);
		}
		dojo.addClass(li, "mblItemSelected");
		this.transitionTo(this.moveTo, this.href, this.url, this.scene);
	},

	onAnchorLabelClicked: function(e){
	},

	_setRightTextAttr: function(/*String*/text){
		this.rightText = text;
		if(!this._rightTextNode){
			this._rightTextNode = dojo.create("DIV", {className:"mblRightText"}, this.anchorNode);
		}
		this._rightTextNode.innerHTML = text;
	}
});

dojo.declare(
	"dojox.mobile.Switch",
	dijit._WidgetBase,
{
	value: "on",
	leftLabel: "ON",
	rightLabel: "OFF",
	_width: 53,

	buildRendering: function(){
		this.domNode = this.srcNodeRef || dojo.doc.createElement("DIV");
		this.domNode.className = "mblSwitch";
		this.domNode.innerHTML =
			  '<div class="mblSwitchInner">'
			+	'<div class="mblSwitchBg mblSwitchBgLeft">'
			+		'<div class="mblSwitchText mblSwitchTextLeft">'+this.leftLabel+'</div>'
			+	'</div>'
			+	'<div class="mblSwitchBg mblSwitchBgRight">'
			+		'<div class="mblSwitchText mblSwitchTextRight">'+this.rightLabel+'</div>'
			+	'</div>'
			+	'<div class="mblSwitchKnob"></div>'
			+ '</div>';
		var n = this.inner = this.domNode.firstChild;
		this.left = n.childNodes[0];
		this.right = n.childNodes[1];
		this.knob = n.childNodes[2];

		dojo.addClass(this.domNode, (this.value == "on") ? "mblSwitchOn" : "mblSwitchOff");
		this[this.value == "off" ? "left" : "right"].style.display = "none";
	},

	postCreate: function(){
		this.connect(this.knob, "onclick", "onClick");
		this.connect(this.knob, "touchstart", "onTouchStart");
		this.connect(this.knob, "mousedown", "onTouchStart");
	},

	_changeState: function(/*String*/state){
		this.inner.style.left = "";
		dojo.addClass(this.domNode, "mblSwitchAnimation");
		dojo.removeClass(this.domNode, (state == "on") ? "mblSwitchOff" : "mblSwitchOn");
		dojo.addClass(this.domNode, (state == "on") ? "mblSwitchOn" : "mblSwitchOff");

		var _this = this;
		setTimeout(function(){
			_this[state == "off" ? "left" : "right"].style.display = "none";
			dojo.removeClass(_this.domNode, "mblSwitchAnimation");
		}, 300);
	},

	onClick: function(e){
		if(this._moved){ return; }
		this.value = (this.value == "on") ? "off" : "on";
		this._changeState(this.value);
		this.onStateChanged(this.value);
	},

	onTouchStart: function(e){
		this._moved = false;
		this.innerStartX = this.inner.offsetLeft;
		if(e.targetTouches){
			this.touchStartX = e.targetTouches[0].clientX;
			this._conn1 = dojo.connect(this.inner, "touchmove", this, "onTouchMove");
			this._conn2 = dojo.connect(this.inner, "touchend", this, "onTouchEnd");
		}
		this.left.style.display = "block";
		this.right.style.display = "block";
		dojo.stopEvent(e);
	},

	onTouchMove: function(e){
		e.preventDefault();
		var dx;
		if(e.targetTouches){
			if(e.targetTouches.length != 1){ return false; }
			dx = e.targetTouches[0].clientX - this.touchStartX;
		}else{
			dx = e.clientX - this.touchStartX;
		}
		var pos = this.innerStartX + dx;
		var d = 10;
		if(pos <= -(this._width-d)){ pos = -this._width; }
		if(pos >= -d){ pos = 0; }
		this.inner.style.left = pos + "px";
		this._moved = true;
	},

	onTouchEnd: function(e){
		dojo.disconnect(this._conn1);
		dojo.disconnect(this._conn2);
		if(this.innerStartX == this.inner.offsetLeft){
			if(dojo.isWebKit){
				var ev = dojo.doc.createEvent("MouseEvents");
				ev.initEvent("click", true, true);
				this.knob.dispatchEvent(ev);
			}
			return;
		}
		var newState = (this.inner.offsetLeft < -(this._width/2)) ? "off" : "on";
		this._changeState(newState);
		if(newState != this.value){
			this.value = newState;
			this.onStateChanged(this.value);
		}
	},

	onStateChanged: function(/*String*/newState){
	}
});

dojo.declare(
	"dojox.mobile.Button",
	dijit._WidgetBase,
{
	btnClass: "mblBlueButton",
	duration: 1000, // duration of selection, milliseconds

	label: null,

	buildRendering: function(){
		this.domNode = this.containerNode = this.srcNodeRef || dojo.doc.createElement("BUTTON");
		this.domNode.className = "mblButton "+this.btnClass;

		if(this.label){
			this.domNode.innerHTML = this.label;
		}

		this.connect(this.domNode, "onclick", "onClick");
	},

	onClick: function(e){
		var button = this.domNode;
		var c = "mblButtonSelected "+this.btnClass+"Selected";
		dojo.addClass(button, c);
		setTimeout(function(){
			dojo.removeClass(button, c);
		}, this.duration);
	}
});

dojo.declare(
	"dojox.mobile.ToolBarButton",
	dojox.mobile.AbstractItem,
{
	selected: false,
	_defaultColor: "mblColorDefault",
	_selColor: "mblColorDefaultSel",

	buildRendering: function(){
		this.inheritParams();
		this.domNode = this.containerNode = this.srcNodeRef || dojo.doc.createElement("div");
		dojo.addClass(this.domNode, "mblToolbarButton mblArrowButtonText");
		var color;
		if(this.selected){
			color = this._selColor;
		}else if(this.domNode.className.indexOf("mblColor") == -1){
			color = this._defaultColor;
		}
		dojo.addClass(this.domNode, color);

		if(this.label){
			this.domNode.innerHTML = this.label;
		}else{
			this.label = this.domNode.innerHTML;
		}

		if(this.icon && this.icon != "none"){
			var img;
			if(this.iconPos){
				var iconDiv = dojo.create("DIV", null, this.domNode);
				img = dojo.create("IMG", null, iconDiv);
				img.style.position = "absolute";
				var arr = this.iconPos.split(/[ ,]/);
				dojo.style(iconDiv, {
					position: "relative",
					width: arr[2] + "px",
					height: arr[3] + "px"
				});
			}else{
				img = dojo.create("IMG", null, this.domNode);
			}
			img.src = this.icon;
			dojox.mobile.setupIcon(img, this.iconPos);
			this.iconNode = img;
		}
		this.createDomButton(this.domNode);
		this.connect(this.domNode, "onclick", "onClick");
	},

	select: function(/*Boolean?*/deselect){
		dojo.toggleClass(this.domNode, this._selColor, !deselect);
		this.selected = !deselect;
	},

	onClick: function(e){
		this.defaultClickAction();
	}
});

dojo.declare(
	"dojox.mobile.ProgressIndicator",
	null,
{
	interval: 100, // milliseconds
	colors: [
		"#C0C0C0", "#C0C0C0", "#C0C0C0", "#C0C0C0",
		"#C0C0C0", "#C0C0C0", "#B8B9B8", "#AEAFAE",
		"#A4A5A4", "#9A9A9A", "#8E8E8E", "#838383"
	],

	_bars: [],

	constructor: function(){
		this.domNode = dojo.create("DIV");
		this.domNode.className = "mblProgContainer";
		for(var i = 0; i < 12; i++){
			var div = dojo.create("DIV");
			div.className = "mblProg mblProg"+i;
			this.domNode.appendChild(div);
			this._bars.push(div);
		}
	},

	start: function(){
		var cntr = 0;
		var _this = this;
		this.timer = setInterval(function(){
			cntr--;
			cntr = cntr < 0 ? 11 : cntr;
			var c = _this.colors;
			for(var i = 0; i < 12; i++){
				var idx = (cntr + i) % 12;
				_this._bars[i].style.backgroundColor = c[idx];
			}
		}, this.interval);
	},

	stop: function(){
		if(this.timer){
			clearInterval(this.timer);
		}
		this.timer = null;
		if(this.domNode.parentNode){
			this.domNode.parentNode.removeChild(this.domNode);
		}
	}
});
dojox.mobile.ProgressIndicator._instance = null;
dojox.mobile.ProgressIndicator.getInstance = function(){
	if(!dojox.mobile.ProgressIndicator._instance){
		dojox.mobile.ProgressIndicator._instance = new dojox.mobile.ProgressIndicator();
	}
	return dojox.mobile.ProgressIndicator._instance;
};

dojox.mobile.addClass = function(){
	// summary:
	//		Adds a theme class name to <body>.
	// description:
	//		Finds the currently applied theme name, such as 'iphone' or 'android'
	//		from link elements, and adds it as a class name for the body element.
	var elems = document.getElementsByTagName("link");
	for(var i = 0, len = elems.length; i < len; i++){
		if(elems[i].href.match(/dojox\/mobile\/themes\/(\w+)\//)){
			dojox.mobile.theme = RegExp.$1;
			dojo.addClass(dojo.body(), dojox.mobile.theme);
			break;
		}
	}
};

dojox.mobile.setupIcon = function(/*DomNode*/iconNode, /*String*/iconPos){
	if(iconNode && iconPos){
		var arr = dojo.map(iconPos.split(/[ ,]/),
								function(item){ return item - 0; });
		var t = arr[0]; // top
		var r = arr[1] + arr[2]; // right
		var b = arr[0] + arr[3]; // bottom
		var l = arr[1]; // left
		iconNode.style.clip = "rect("+t+"px "+r+"px "+b+"px "+l+"px)";
		iconNode.style.top = dojo.style(iconNode, "top") - t + "px";
		iconNode.style.left = dojo.style(iconNode.parentNode, "paddingLeft") - l + "px";
	}
};

dojox.mobile.hideAddressBar = function(){
	dojo.body().style.minHeight = "1000px"; // to ensure enough height for scrollTo to work
	setTimeout(function(){ scrollTo(0, 1); }, 100);
	setTimeout(function(){ scrollTo(0, 1); }, 400);
	setTimeout(function(){
		scrollTo(0, 1);
		// re-define the min-height with the actual height
		dojo.body().style.minHeight = (dojo.global.innerHeight||dojo.doc.documentElement.clientHeight) + "px";
	}, 1000);
};

dojox.mobile.openWindow = function(url, target){
	dojo.global.open(url, target || "_blank");
};

dojo._loaders.unshift(function(){
	// avoid use of dojo.query
	/*
	var list = dojo.query('[lazy=true] [dojoType]', null);
	list.forEach(function(node, index, nodeList){
		node.setAttribute("__dojoType", node.getAttribute("dojoType"));
		node.removeAttribute("dojoType");
	});
	*/

	var nodes = dojo.body().getElementsByTagName("*");
	var i, len, s;
	len = nodes.length;
	for(i = 0; i < len; i++){
		s = nodes[i].getAttribute("dojoType");
		if(s){
			if(nodes[i].parentNode.getAttribute("lazy") == "true"){
				nodes[i].setAttribute("__dojoType", s);
				nodes[i].removeAttribute("dojoType");
			}
		}
	}
});

dojo.addOnLoad(function(){
	dojox.mobile.addClass();
	if(dojo.config["mblApplyPageStyles"] !== false){
		dojo.addClass(dojo.doc.documentElement, "mobile");
	}

	//	You can disable hiding the address bar with the following djConfig.
	//	var djConfig = { mblHideAddressBar: false };
	if(dojo.config["mblHideAddressBar"] !== false){
		dojox.mobile.hideAddressBar();
		if(dojo.config["mblAlwaysHideAddressBar"] == true){
			if(dojo.global.onorientationchange !== undefined){
				dojo.connect(dojo.global, "onorientationchange", dojox.mobile.hideAddressBar);
			}else{
				dojo.connect(dojo.global, "onresize", dojox.mobile.hideAddressBar);
			}
		}
	}

	// avoid use of dojo.query
	/*
	var list = dojo.query('[__dojoType]', null);
	list.forEach(function(node, index, nodeList){
		node.setAttribute("dojoType", node.getAttribute("__dojoType"));
		node.removeAttribute("__dojoType");
	});
	*/

	var nodes = dojo.body().getElementsByTagName("*");
	var i, len = nodes.length, s;
	for(i = 0; i < len; i++){
		s = nodes[i].getAttribute("__dojoType");
		if(s){
			nodes[i].setAttribute("dojoType", s);
			nodes[i].removeAttribute("__dojoType");
		}
	}

	if(dojo.hash){
		// find widgets under root recursively
		var findWidgets = function(root){
			var arr;
			arr = dijit.findWidgets(root);
			var widgets = arr;
			for(var i = 0; i < widgets.length; i++){
				arr = arr.concat(findWidgets(widgets[i].containerNode));
			}
			return arr;
		};
		dojo.subscribe("/dojo/hashchange", null, function(value){
			var view = dojox.mobile.currentView;
			if(!view){ return; }
			var params = dojox.mobile._params;
			if(!params){ // browser back/forward button was pressed
				var moveTo = value ? value : dojox.mobile._defaultView.id;
				var widgets = findWidgets(view.domNode);
				var dir = 1, transition = "slide";
				for(i = 0; i < widgets.length; i++){
					var w = widgets[i];
					if("#"+moveTo == w.moveTo){
						// found a widget that has the given moveTo
						transition = w.transition;
						dir = (w instanceof dojox.mobile.Heading) ? -1 : 1;
						break;
					}
				}
				params = [ moveTo, dir, transition ];
			}
			view.performTransition.apply(view, params);
			dojox.mobile._params = null;
		});
	}

	dojo.body().style.visibility = "visible";
});

dijit.getEnclosingWidget = function(node){
	while(node && node.tagName !== "BODY"){
		if(node.getAttribute && node.getAttribute("widgetId")){
			return dijit.registry.byId(node.getAttribute("widgetId"));
		}
		node = node._parentNode || node.parentNode;
	}
	return null;
};

}

if(!dojo._hasResource["dojox.mobile"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile"] = true;
dojo.provide("dojox.mobile");

dojo.experimental("dojox.mobile");


}

