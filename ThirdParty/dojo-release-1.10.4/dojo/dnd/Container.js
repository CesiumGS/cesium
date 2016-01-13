define([
	"../_base/array",
	"../_base/declare",
	"../_base/kernel",
	"../_base/lang",
	"../_base/window",
	"../dom",
	"../dom-class",
	"../dom-construct",
	"../Evented",
	"../has",
	"../on",
	"../query",
	"../touch",
	"./common"
], function(
	array, declare, kernel, lang, win,
	dom, domClass, domConstruct, Evented, has, on, query, touch, dnd){

// module:
//		dojo/dnd/Container

/*
	Container states:
		""		- normal state
		"Over"	- mouse over a container
	Container item states:
		""		- normal state
		"Over"	- mouse over a container item
*/



var Container = declare("dojo.dnd.Container", Evented, {
	// summary:
	//		a Container object, which knows when mouse hovers over it,
	//		and over which element it hovers

	// object attributes (for markup)
	skipForm: false,
	// allowNested: Boolean
	//		Indicates whether to allow dnd item nodes to be nested within other elements.
	//		By default this is false, indicating that only direct children of the container can
	//		be draggable dnd item nodes
	allowNested: false,
	/*=====
	// current: DomNode
	//		The DOM node the mouse is currently hovered over
	current: null,

	// map: Hash<String, Container.Item>
	//		Map from an item's id (which is also the DOMNode's id) to
	//		the dojo/dnd/Container.Item itself.
	map: {},
	=====*/

	constructor: function(node, params){
		// summary:
		//		a constructor of the Container
		// node: Node
		//		node or node's id to build the container on
		// params: Container.__ContainerArgs
		//		a dictionary of parameters
		this.node = dom.byId(node);
		if(!params){ params = {}; }
		this.creator = params.creator || null;
		this.skipForm = params.skipForm;
		this.parent = params.dropParent && dom.byId(params.dropParent);

		// class-specific variables
		this.map = {};
		this.current = null;

		// states
		this.containerState = "";
		domClass.add(this.node, "dojoDndContainer");

		// mark up children
		if(!(params && params._skipStartup)){
			this.startup();
		}

		// set up events
		this.events = [
			on(this.node, touch.over, lang.hitch(this, "onMouseOver")),
			on(this.node, touch.out,  lang.hitch(this, "onMouseOut")),
			// cancel text selection and text dragging
			on(this.node, "dragstart",   lang.hitch(this, "onSelectStart")),
			on(this.node, "selectstart", lang.hitch(this, "onSelectStart"))
		];
	},

	// object attributes (for markup)
	creator: function(){
		// summary:
		//		creator function, dummy at the moment
	},

	// abstract access to the map
	getItem: function(/*String*/ key){
		// summary:
		//		returns a data item by its key (id)
		return this.map[key];	// Container.Item
	},
	setItem: function(/*String*/ key, /*Container.Item*/ data){
		// summary:
		//		associates a data item with its key (id)
		this.map[key] = data;
	},
	delItem: function(/*String*/ key){
		// summary:
		//		removes a data item from the map by its key (id)
		delete this.map[key];
	},
	forInItems: function(/*Function*/ f, /*Object?*/ o){
		// summary:
		//		iterates over a data map skipping members that
		//		are present in the empty object (IE and/or 3rd-party libraries).
		o = o || kernel.global;
		var m = this.map, e = dnd._empty;
		for(var i in m){
			if(i in e){ continue; }
			f.call(o, m[i], i, this);
		}
		return o;	// Object
	},
	clearItems: function(){
		// summary:
		//		removes all data items from the map
		this.map = {};
	},

	// methods
	getAllNodes: function(){
		// summary:
		//		returns a list (an array) of all valid child nodes
		return query((this.allowNested ? "" : "> ") + ".dojoDndItem", this.parent);	// NodeList
	},
	sync: function(){
		// summary:
		//		sync up the node list with the data map
		var map = {};
		this.getAllNodes().forEach(function(node){
			if(node.id){
				var item = this.getItem(node.id);
				if(item){
					map[node.id] = item;
					return;
				}
			}else{
				node.id = dnd.getUniqueId();
			}
			var type = node.getAttribute("dndType"),
				data = node.getAttribute("dndData");
			map[node.id] = {
				data: data || node.innerHTML,
				type: type ? type.split(/\s*,\s*/) : ["text"]
			};
		}, this);
		this.map = map;
		return this;	// self
	},
	insertNodes: function(data, before, anchor){
		// summary:
		//		inserts an array of new nodes before/after an anchor node
		// data: Array
		//		a list of data items, which should be processed by the creator function
		// before: Boolean
		//		insert before the anchor, if true, and after the anchor otherwise
		// anchor: Node
		//		the anchor node to be used as a point of insertion
		if(!this.parent.firstChild){
			anchor = null;
		}else if(before){
			if(!anchor){
				anchor = this.parent.firstChild;
			}
		}else{
			if(anchor){
				anchor = anchor.nextSibling;
			}
		}
		var i, t;
		if(anchor){
			for(i = 0; i < data.length; ++i){
				t = this._normalizedCreator(data[i]);
				this.setItem(t.node.id, {data: t.data, type: t.type});
				anchor.parentNode.insertBefore(t.node, anchor);
			}
		}else{
			for(i = 0; i < data.length; ++i){
				t = this._normalizedCreator(data[i]);
				this.setItem(t.node.id, {data: t.data, type: t.type});
				this.parent.appendChild(t.node);
			}
		}
		return this;	// self
	},
	destroy: function(){
		// summary:
		//		prepares this object to be garbage-collected
		array.forEach(this.events, function(handle){ handle.remove(); });
		this.clearItems();
		this.node = this.parent = this.current = null;
	},

	// markup methods
	markupFactory: function(params, node, Ctor){
		params._skipStartup = true;
		return new Ctor(node, params);
	},
	startup: function(){
		// summary:
		//		collects valid child items and populate the map

		// set up the real parent node
		if(!this.parent){
			// use the standard algorithm, if not assigned
			this.parent = this.node;
			if(this.parent.tagName.toLowerCase() == "table"){
				var c = this.parent.getElementsByTagName("tbody");
				if(c && c.length){ this.parent = c[0]; }
			}
		}
		this.defaultCreator = dnd._defaultCreator(this.parent);

		// process specially marked children
		this.sync();
	},

	// mouse events
	onMouseOver: function(e){
		// summary:
		//		event processor for onmouseover or touch, to mark that element as the current element
		// e: Event
		//		mouse event
		var n = e.relatedTarget;
		while(n){
			if(n == this.node){ break; }
			try{
				n = n.parentNode;
			}catch(x){
				n = null;
			}
		}
		if(!n){
			this._changeState("Container", "Over");
			this.onOverEvent();
		}
		n = this._getChildByEvent(e);
		if(this.current == n){ return; }
		if(this.current){ this._removeItemClass(this.current, "Over"); }
		if(n){ this._addItemClass(n, "Over"); }
		this.current = n;
	},
	onMouseOut: function(e){
		// summary:
		//		event processor for onmouseout
		// e: Event
		//		mouse event
		for(var n = e.relatedTarget; n;){
			if(n == this.node){ return; }
			try{
				n = n.parentNode;
			}catch(x){
				n = null;
			}
		}
		if(this.current){
			this._removeItemClass(this.current, "Over");
			this.current = null;
		}
		this._changeState("Container", "");
		this.onOutEvent();
	},
	onSelectStart: function(e){
		// summary:
		//		event processor for onselectevent and ondragevent
		// e: Event
		//		mouse event
		if(!this.skipForm || !dnd.isFormElement(e)){
			e.stopPropagation();
			e.preventDefault();
		}
	},

	// utilities
	onOverEvent: function(){
		// summary:
		//		this function is called once, when mouse is over our container
	},
	onOutEvent: function(){
		// summary:
		//		this function is called once, when mouse is out of our container
	},
	_changeState: function(type, newState){
		// summary:
		//		changes a named state to new state value
		// type: String
		//		a name of the state to change
		// newState: String
		//		new state
		var prefix = "dojoDnd" + type;
		var state  = type.toLowerCase() + "State";
		//domClass.replace(this.node, prefix + newState, prefix + this[state]);
		domClass.replace(this.node, prefix + newState, prefix + this[state]);
		this[state] = newState;
	},
	_addItemClass: function(node, type){
		// summary:
		//		adds a class with prefix "dojoDndItem"
		// node: Node
		//		a node
		// type: String
		//		a variable suffix for a class name
		domClass.add(node, "dojoDndItem" + type);
	},
	_removeItemClass: function(node, type){
		// summary:
		//		removes a class with prefix "dojoDndItem"
		// node: Node
		//		a node
		// type: String
		//		a variable suffix for a class name
		domClass.remove(node, "dojoDndItem" + type);
	},
	_getChildByEvent: function(e){
		// summary:
		//		gets a child, which is under the mouse at the moment, or null
		// e: Event
		//		a mouse event
		var node = e.target;
		if(node){
			for(var parent = node.parentNode; parent; node = parent, parent = node.parentNode){
				if((parent == this.parent || this.allowNested) && domClass.contains(node, "dojoDndItem")){ return node; }
			}
		}
		return null;
	},
	_normalizedCreator: function(/*Container.Item*/ item, /*String*/ hint){
		// summary:
		//		adds all necessary data to the output of the user-supplied creator function
		var t = (this.creator || this.defaultCreator).call(this, item, hint);
		if(!lang.isArray(t.type)){ t.type = ["text"]; }
		if(!t.node.id){ t.node.id = dnd.getUniqueId(); }
		domClass.add(t.node, "dojoDndItem");
		return t;
	}
});

dnd._createNode = function(tag){
	// summary:
	//		returns a function, which creates an element of given tag
	//		(SPAN by default) and sets its innerHTML to given text
	// tag: String
	//		a tag name or empty for SPAN
	if(!tag){ return dnd._createSpan; }
	return function(text){	// Function
		return domConstruct.create(tag, {innerHTML: text});	// Node
	};
};

dnd._createTrTd = function(text){
	// summary:
	//		creates a TR/TD structure with given text as an innerHTML of TD
	// text: String
	//		a text for TD
	var tr = domConstruct.create("tr");
	domConstruct.create("td", {innerHTML: text}, tr);
	return tr;	// Node
};

dnd._createSpan = function(text){
	// summary:
	//		creates a SPAN element with given text as its innerHTML
	// text: String
	//		a text for SPAN
	return domConstruct.create("span", {innerHTML: text});	// Node
};

// dnd._defaultCreatorNodes: Object
//		a dictionary that maps container tag names to child tag names
dnd._defaultCreatorNodes = {ul: "li", ol: "li", div: "div", p: "div"};

dnd._defaultCreator = function(node){
	// summary:
	//		takes a parent node, and returns an appropriate creator function
	// node: Node
	//		a container node
	var tag = node.tagName.toLowerCase();
	var c = tag == "tbody" || tag == "thead" ? dnd._createTrTd :
			dnd._createNode(dnd._defaultCreatorNodes[tag]);
	return function(item, hint){	// Function
		var isObj = item && lang.isObject(item), data, type, n;
		if(isObj && item.tagName && item.nodeType && item.getAttribute){
			// process a DOM node
			data = item.getAttribute("dndData") || item.innerHTML;
			type = item.getAttribute("dndType");
			type = type ? type.split(/\s*,\s*/) : ["text"];
			n = item;	// this node is going to be moved rather than copied
		}else{
			// process a DnD item object or a string
			data = (isObj && item.data) ? item.data : item;
			type = (isObj && item.type) ? item.type : ["text"];
			n = (hint == "avatar" ? dnd._createSpan : c)(String(data));
		}
		if(!n.id){
			n.id = dnd.getUniqueId();
		}
		return {node: n, data: data, type: type};
	};
};

/*=====
Container.__ContainerArgs = declare([], {
	creator: function(){
		// summary:
		//		a creator function, which takes a data item, and returns an object like that:
		//		{node: newNode, data: usedData, type: arrayOfStrings}
	},

	// skipForm: Boolean
	//		don't start the drag operation, if clicked on form elements
	skipForm: false,

	// dropParent: Node||String
	//		node or node's id to use as the parent node for dropped items
	//		(must be underneath the 'node' parameter in the DOM)
	dropParent: null,

	// _skipStartup: Boolean
	//		skip startup(), which collects children, for deferred initialization
	//		(this is used in the markup mode)
	_skipStartup: false
});

Container.Item = function(){
	// summary:
	//		Represents (one of) the source node(s) being dragged.
	//		Contains (at least) the "type" and "data" attributes.
	// type: String[]
	//		Type(s) of this item, by default this is ["text"]
	// data: Object
	//		Logical representation of the object being dragged.
	//		If the drag object's type is "text" then data is a String,
	//		if it's another type then data could be a different Object,
	//		perhaps a name/value hash.

	this.type = type;
	this.data = data;
};
=====*/

return Container;
});
