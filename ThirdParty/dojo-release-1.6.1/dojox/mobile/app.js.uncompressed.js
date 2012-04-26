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

if(!dojo._hasResource["dojo.window"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.window"] = true;
dojo.provide("dojo.window");

dojo.getObject("window", true, dojo);

dojo.window.getBox = function(){
	// summary:
	//		Returns the dimensions and scroll position of the viewable area of a browser window

	var scrollRoot = (dojo.doc.compatMode == 'BackCompat') ? dojo.body() : dojo.doc.documentElement;

	// get scroll position
	var scroll = dojo._docScroll(); // scrollRoot.scrollTop/Left should work
	return { w: scrollRoot.clientWidth, h: scrollRoot.clientHeight, l: scroll.x, t: scroll.y };
};

dojo.window.get = function(doc){
	// summary:
	// 		Get window object associated with document doc

	// In some IE versions (at least 6.0), document.parentWindow does not return a
	// reference to the real window object (maybe a copy), so we must fix it as well
	// We use IE specific execScript to attach the real window reference to
	// document._parentWindow for later use
	if(dojo.isIE && window !== document.parentWindow){
		/*
		In IE 6, only the variable "window" can be used to connect events (others
		may be only copies).
		*/
		doc.parentWindow.execScript("document._parentWindow = window;", "Javascript");
		//to prevent memory leak, unset it after use
		//another possibility is to add an onUnload handler which seems overkill to me (liucougar)
		var win = doc._parentWindow;
		doc._parentWindow = null;
		return win;	//	Window
	}

	return doc.parentWindow || doc.defaultView;	//	Window
};

dojo.window.scrollIntoView = function(/*DomNode*/ node, /*Object?*/ pos){
	// summary:
	//		Scroll the passed node into view, if it is not already.
	
	// don't rely on node.scrollIntoView working just because the function is there

	try{ // catch unexpected/unrecreatable errors (#7808) since we can recover using a semi-acceptable native method
		node = dojo.byId(node);
		var doc = node.ownerDocument || dojo.doc,
			body = doc.body || dojo.body(),
			html = doc.documentElement || body.parentNode,
			isIE = dojo.isIE, isWK = dojo.isWebKit;
		// if an untested browser, then use the native method
		if((!(dojo.isMoz || isIE || isWK || dojo.isOpera) || node == body || node == html) && (typeof node.scrollIntoView != "undefined")){
			node.scrollIntoView(false); // short-circuit to native if possible
			return;
		}
		var backCompat = doc.compatMode == 'BackCompat',
			clientAreaRoot = (isIE >= 9 && node.ownerDocument.parentWindow.frameElement)
				? ((html.clientHeight > 0 && html.clientWidth > 0 && (body.clientHeight == 0 || body.clientWidth == 0 || body.clientHeight > html.clientHeight || body.clientWidth > html.clientWidth)) ? html : body)
				: (backCompat ? body : html),
			scrollRoot = isWK ? body : clientAreaRoot,
			rootWidth = clientAreaRoot.clientWidth,
			rootHeight = clientAreaRoot.clientHeight,
			rtl = !dojo._isBodyLtr(),
			nodePos = pos || dojo.position(node),
			el = node.parentNode,
			isFixed = function(el){
				return ((isIE <= 6 || (isIE && backCompat))? false : (dojo.style(el, 'position').toLowerCase() == "fixed"));
			};
		if(isFixed(node)){ return; } // nothing to do

		while(el){
			if(el == body){ el = scrollRoot; }
			var elPos = dojo.position(el),
				fixedPos = isFixed(el);
	
			if(el == scrollRoot){
				elPos.w = rootWidth; elPos.h = rootHeight;
				if(scrollRoot == html && isIE && rtl){ elPos.x += scrollRoot.offsetWidth-elPos.w; } // IE workaround where scrollbar causes negative x
				if(elPos.x < 0 || !isIE){ elPos.x = 0; } // IE can have values > 0
				if(elPos.y < 0 || !isIE){ elPos.y = 0; }
			}else{
				var pb = dojo._getPadBorderExtents(el);
				elPos.w -= pb.w; elPos.h -= pb.h; elPos.x += pb.l; elPos.y += pb.t;
				var clientSize = el.clientWidth,
					scrollBarSize = elPos.w - clientSize;
				if(clientSize > 0 && scrollBarSize > 0){
					elPos.w = clientSize;
					elPos.x += (rtl && (isIE || el.clientLeft > pb.l/*Chrome*/)) ? scrollBarSize : 0;
				}
				clientSize = el.clientHeight;
				scrollBarSize = elPos.h - clientSize;
				if(clientSize > 0 && scrollBarSize > 0){
					elPos.h = clientSize;
				}
			}
			if(fixedPos){ // bounded by viewport, not parents
				if(elPos.y < 0){
					elPos.h += elPos.y; elPos.y = 0;
				}
				if(elPos.x < 0){
					elPos.w += elPos.x; elPos.x = 0;
				}
				if(elPos.y + elPos.h > rootHeight){
					elPos.h = rootHeight - elPos.y;
				}
				if(elPos.x + elPos.w > rootWidth){
					elPos.w = rootWidth - elPos.x;
				}
			}
			// calculate overflow in all 4 directions
			var l = nodePos.x - elPos.x, // beyond left: < 0
				t = nodePos.y - Math.max(elPos.y, 0), // beyond top: < 0
				r = l + nodePos.w - elPos.w, // beyond right: > 0
				bot = t + nodePos.h - elPos.h; // beyond bottom: > 0
			if(r * l > 0){
				var s = Math[l < 0? "max" : "min"](l, r);
				if(rtl && ((isIE == 8 && !backCompat) || isIE >= 9)){ s = -s; }
				nodePos.x += el.scrollLeft;
				el.scrollLeft += s;
				nodePos.x -= el.scrollLeft;
			}
			if(bot * t > 0){
				nodePos.y += el.scrollTop;
				el.scrollTop += Math[t < 0? "max" : "min"](t, bot);
				nodePos.y -= el.scrollTop;
			}
			el = (el != scrollRoot) && !fixedPos && el.parentNode;
		}
	}catch(error){
		console.error('scrollIntoView: ' + error);
		node.scrollIntoView(false);
	}
};

}

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

if(!dojo._hasResource["dijit._base.focus"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.focus"] = true;
dojo.provide("dijit._base.focus");




// summary:
//		These functions are used to query or set the focus and selection.
//
//		Also, they trace when widgets become activated/deactivated,
//		so that the widget can fire _onFocus/_onBlur events.
//		"Active" here means something similar to "focused", but
//		"focus" isn't quite the right word because we keep track of
//		a whole stack of "active" widgets.  Example: ComboButton --> Menu -->
//		MenuItem.  The onBlur event for ComboButton doesn't fire due to focusing
//		on the Menu or a MenuItem, since they are considered part of the
//		ComboButton widget.  It only happens when focus is shifted
//		somewhere completely different.

dojo.mixin(dijit, {
	// _curFocus: DomNode
	//		Currently focused item on screen
	_curFocus: null,

	// _prevFocus: DomNode
	//		Previously focused item on screen
	_prevFocus: null,

	isCollapsed: function(){
		// summary:
		//		Returns true if there is no text selected
		return dijit.getBookmark().isCollapsed;
	},

	getBookmark: function(){
		// summary:
		//		Retrieves a bookmark that can be used with moveToBookmark to return to the same range
		var bm, rg, tg, sel = dojo.doc.selection, cf = dijit._curFocus;

		if(dojo.global.getSelection){
			//W3C Range API for selections.
			sel = dojo.global.getSelection();
			if(sel){
				if(sel.isCollapsed){
					tg = cf? cf.tagName : "";
					if(tg){
						//Create a fake rangelike item to restore selections.
						tg = tg.toLowerCase();
						if(tg == "textarea" ||
								(tg == "input" && (!cf.type || cf.type.toLowerCase() == "text"))){
							sel = {
								start: cf.selectionStart,
								end: cf.selectionEnd,
								node: cf,
								pRange: true
							};
							return {isCollapsed: (sel.end <= sel.start), mark: sel}; //Object.
						}
					}
					bm = {isCollapsed:true};
					if(sel.rangeCount){
						bm.mark = sel.getRangeAt(0).cloneRange();
					}
				}else{
					rg = sel.getRangeAt(0);
					bm = {isCollapsed: false, mark: rg.cloneRange()};
				}
			}
		}else if(sel){
			// If the current focus was a input of some sort and no selection, don't bother saving
			// a native bookmark.  This is because it causes issues with dialog/page selection restore.
			// So, we need to create psuedo bookmarks to work with.
			tg = cf ? cf.tagName : "";
			tg = tg.toLowerCase();
			if(cf && tg && (tg == "button" || tg == "textarea" || tg == "input")){
				if(sel.type && sel.type.toLowerCase() == "none"){
					return {
						isCollapsed: true,
						mark: null
					}
				}else{
					rg = sel.createRange();
					return {
						isCollapsed: rg.text && rg.text.length?false:true,
						mark: {
							range: rg,
							pRange: true
						}
					};
				}
			}
			bm = {};

			//'IE' way for selections.
			try{
				// createRange() throws exception when dojo in iframe
				//and nothing selected, see #9632
				rg = sel.createRange();
				bm.isCollapsed = !(sel.type == 'Text' ? rg.htmlText.length : rg.length);
			}catch(e){
				bm.isCollapsed = true;
				return bm;
			}
			if(sel.type.toUpperCase() == 'CONTROL'){
				if(rg.length){
					bm.mark=[];
					var i=0,len=rg.length;
					while(i<len){
						bm.mark.push(rg.item(i++));
					}
				}else{
					bm.isCollapsed = true;
					bm.mark = null;
				}
			}else{
				bm.mark = rg.getBookmark();
			}
		}else{
			console.warn("No idea how to store the current selection for this browser!");
		}
		return bm; // Object
	},

	moveToBookmark: function(/*Object*/bookmark){
		// summary:
		//		Moves current selection to a bookmark
		// bookmark:
		//		This should be a returned object from dijit.getBookmark()

		var _doc = dojo.doc,
			mark = bookmark.mark;
		if(mark){
			if(dojo.global.getSelection){
				//W3C Rangi API (FF, WebKit, Opera, etc)
				var sel = dojo.global.getSelection();
				if(sel && sel.removeAllRanges){
					if(mark.pRange){
						var r = mark;
						var n = r.node;
						n.selectionStart = r.start;
						n.selectionEnd = r.end;
					}else{
						sel.removeAllRanges();
						sel.addRange(mark);
					}
				}else{
					console.warn("No idea how to restore selection for this browser!");
				}
			}else if(_doc.selection && mark){
				//'IE' way.
				var rg;
				if(mark.pRange){
					rg = mark.range;
				}else if(dojo.isArray(mark)){
					rg = _doc.body.createControlRange();
					//rg.addElement does not have call/apply method, so can not call it directly
					//rg is not available in "range.addElement(item)", so can't use that either
					dojo.forEach(mark, function(n){
						rg.addElement(n);
					});
				}else{
					rg = _doc.body.createTextRange();
					rg.moveToBookmark(mark);
				}
				rg.select();
			}
		}
	},

	getFocus: function(/*Widget?*/ menu, /*Window?*/ openedForWindow){
		// summary:
		//		Called as getFocus(), this returns an Object showing the current focus
		//		and selected text.
		//
		//		Called as getFocus(widget), where widget is a (widget representing) a button
		//		that was just pressed, it returns where focus was before that button
		//		was pressed.   (Pressing the button may have either shifted focus to the button,
		//		or removed focus altogether.)   In this case the selected text is not returned,
		//		since it can't be accurately determined.
		//
		// menu: dijit._Widget or {domNode: DomNode} structure
		//		The button that was just pressed.  If focus has disappeared or moved
		//		to this button, returns the previous focus.  In this case the bookmark
		//		information is already lost, and null is returned.
		//
		// openedForWindow:
		//		iframe in which menu was opened
		//
		// returns:
		//		A handle to restore focus/selection, to be passed to `dijit.focus`
		var node = !dijit._curFocus || (menu && dojo.isDescendant(dijit._curFocus, menu.domNode)) ? dijit._prevFocus : dijit._curFocus;
		return {
			node: node,
			bookmark: (node == dijit._curFocus) && dojo.withGlobal(openedForWindow || dojo.global, dijit.getBookmark),
			openedForWindow: openedForWindow
		}; // Object
	},

	focus: function(/*Object || DomNode */ handle){
		// summary:
		//		Sets the focused node and the selection according to argument.
		//		To set focus to an iframe's content, pass in the iframe itself.
		// handle:
		//		object returned by get(), or a DomNode

		if(!handle){ return; }

		var node = "node" in handle ? handle.node : handle,		// because handle is either DomNode or a composite object
			bookmark = handle.bookmark,
			openedForWindow = handle.openedForWindow,
			collapsed = bookmark ? bookmark.isCollapsed : false;

		// Set the focus
		// Note that for iframe's we need to use the <iframe> to follow the parentNode chain,
		// but we need to set focus to iframe.contentWindow
		if(node){
			var focusNode = (node.tagName.toLowerCase() == "iframe") ? node.contentWindow : node;
			if(focusNode && focusNode.focus){
				try{
					// Gecko throws sometimes if setting focus is impossible,
					// node not displayed or something like that
					focusNode.focus();
				}catch(e){/*quiet*/}
			}
			dijit._onFocusNode(node);
		}

		// set the selection
		// do not need to restore if current selection is not empty
		// (use keyboard to select a menu item) or if previous selection was collapsed
		// as it may cause focus shift (Esp in IE).
		if(bookmark && dojo.withGlobal(openedForWindow || dojo.global, dijit.isCollapsed) && !collapsed){
			if(openedForWindow){
				openedForWindow.focus();
			}
			try{
				dojo.withGlobal(openedForWindow || dojo.global, dijit.moveToBookmark, null, [bookmark]);
			}catch(e2){
				/*squelch IE internal error, see http://trac.dojotoolkit.org/ticket/1984 */
			}
		}
	},

	// _activeStack: dijit._Widget[]
	//		List of currently active widgets (focused widget and it's ancestors)
	_activeStack: [],

	registerIframe: function(/*DomNode*/ iframe){
		// summary:
		//		Registers listeners on the specified iframe so that any click
		//		or focus event on that iframe (or anything in it) is reported
		//		as a focus/click event on the <iframe> itself.
		// description:
		//		Currently only used by editor.
		// returns:
		//		Handle to pass to unregisterIframe()
		return dijit.registerWin(iframe.contentWindow, iframe);
	},

	unregisterIframe: function(/*Object*/ handle){
		// summary:
		//		Unregisters listeners on the specified iframe created by registerIframe.
		//		After calling be sure to delete or null out the handle itself.
		// handle:
		//		Handle returned by registerIframe()

		dijit.unregisterWin(handle);
	},

	registerWin: function(/*Window?*/targetWindow, /*DomNode?*/ effectiveNode){
		// summary:
		//		Registers listeners on the specified window (either the main
		//		window or an iframe's window) to detect when the user has clicked somewhere
		//		or focused somewhere.
		// description:
		//		Users should call registerIframe() instead of this method.
		// targetWindow:
		//		If specified this is the window associated with the iframe,
		//		i.e. iframe.contentWindow.
		// effectiveNode:
		//		If specified, report any focus events inside targetWindow as
		//		an event on effectiveNode, rather than on evt.target.
		// returns:
		//		Handle to pass to unregisterWin()

		// TODO: make this function private in 2.0; Editor/users should call registerIframe(),

		var mousedownListener = function(evt){
			dijit._justMouseDowned = true;
			setTimeout(function(){ dijit._justMouseDowned = false; }, 0);
			
			// workaround weird IE bug where the click is on an orphaned node
			// (first time clicking a Select/DropDownButton inside a TooltipDialog)
			if(dojo.isIE && evt && evt.srcElement && evt.srcElement.parentNode == null){
				return;
			}

			dijit._onTouchNode(effectiveNode || evt.target || evt.srcElement, "mouse");
		};
		//dojo.connect(targetWindow, "onscroll", ???);

		// Listen for blur and focus events on targetWindow's document.
		// IIRC, I'm using attachEvent() rather than dojo.connect() because focus/blur events don't bubble
		// through dojo.connect(), and also maybe to catch the focus events early, before onfocus handlers
		// fire.
		// Connect to <html> (rather than document) on IE to avoid memory leaks, but document on other browsers because
		// (at least for FF) the focus event doesn't fire on <html> or <body>.
		var doc = dojo.isIE ? targetWindow.document.documentElement : targetWindow.document;
		if(doc){
			if(dojo.isIE){
				targetWindow.document.body.attachEvent('onmousedown', mousedownListener);
				var activateListener = function(evt){
					// IE reports that nodes like <body> have gotten focus, even though they have tabIndex=-1,
					// Should consider those more like a mouse-click than a focus....
					if(evt.srcElement.tagName.toLowerCase() != "#document" &&
						dijit.isTabNavigable(evt.srcElement)){
						dijit._onFocusNode(effectiveNode || evt.srcElement);
					}else{
						dijit._onTouchNode(effectiveNode || evt.srcElement);
					}
				};
				doc.attachEvent('onactivate', activateListener);
				var deactivateListener =  function(evt){
					dijit._onBlurNode(effectiveNode || evt.srcElement);
				};
				doc.attachEvent('ondeactivate', deactivateListener);

				return function(){
					targetWindow.document.detachEvent('onmousedown', mousedownListener);
					doc.detachEvent('onactivate', activateListener);
					doc.detachEvent('ondeactivate', deactivateListener);
					doc = null;	// prevent memory leak (apparent circular reference via closure)
				};
			}else{
				doc.body.addEventListener('mousedown', mousedownListener, true);
				var focusListener = function(evt){
					dijit._onFocusNode(effectiveNode || evt.target);
				};
				doc.addEventListener('focus', focusListener, true);
				var blurListener = function(evt){
					dijit._onBlurNode(effectiveNode || evt.target);
				};
				doc.addEventListener('blur', blurListener, true);

				return function(){
					doc.body.removeEventListener('mousedown', mousedownListener, true);
					doc.removeEventListener('focus', focusListener, true);
					doc.removeEventListener('blur', blurListener, true);
					doc = null;	// prevent memory leak (apparent circular reference via closure)
				};
			}
		}
	},

	unregisterWin: function(/*Handle*/ handle){
		// summary:
		//		Unregisters listeners on the specified window (either the main
		//		window or an iframe's window) according to handle returned from registerWin().
		//		After calling be sure to delete or null out the handle itself.

		// Currently our handle is actually a function
		handle && handle();
	},

	_onBlurNode: function(/*DomNode*/ node){
		// summary:
		// 		Called when focus leaves a node.
		//		Usually ignored, _unless_ it *isn't* follwed by touching another node,
		//		which indicates that we tabbed off the last field on the page,
		//		in which case every widget is marked inactive
		dijit._prevFocus = dijit._curFocus;
		dijit._curFocus = null;

		if(dijit._justMouseDowned){
			// the mouse down caused a new widget to be marked as active; this blur event
			// is coming late, so ignore it.
			return;
		}

		// if the blur event isn't followed by a focus event then mark all widgets as inactive.
		if(dijit._clearActiveWidgetsTimer){
			clearTimeout(dijit._clearActiveWidgetsTimer);
		}
		dijit._clearActiveWidgetsTimer = setTimeout(function(){
			delete dijit._clearActiveWidgetsTimer;
			dijit._setStack([]);
			dijit._prevFocus = null;
		}, 100);
	},

	_onTouchNode: function(/*DomNode*/ node, /*String*/ by){
		// summary:
		//		Callback when node is focused or mouse-downed
		// node:
		//		The node that was touched.
		// by:
		//		"mouse" if the focus/touch was caused by a mouse down event

		// ignore the recent blurNode event
		if(dijit._clearActiveWidgetsTimer){
			clearTimeout(dijit._clearActiveWidgetsTimer);
			delete dijit._clearActiveWidgetsTimer;
		}

		// compute stack of active widgets (ex: ComboButton --> Menu --> MenuItem)
		var newStack=[];
		try{
			while(node){
				var popupParent = dojo.attr(node, "dijitPopupParent");
				if(popupParent){
					node=dijit.byId(popupParent).domNode;
				}else if(node.tagName && node.tagName.toLowerCase() == "body"){
					// is this the root of the document or just the root of an iframe?
					if(node === dojo.body()){
						// node is the root of the main document
						break;
					}
					// otherwise, find the iframe this node refers to (can't access it via parentNode,
					// need to do this trick instead). window.frameElement is supported in IE/FF/Webkit
					node=dojo.window.get(node.ownerDocument).frameElement;
				}else{
					// if this node is the root node of a widget, then add widget id to stack,
					// except ignore clicks on disabled widgets (actually focusing a disabled widget still works,
					// to support MenuItem)
					var id = node.getAttribute && node.getAttribute("widgetId"),
						widget = id && dijit.byId(id);
					if(widget && !(by == "mouse" && widget.get("disabled"))){
						newStack.unshift(id);
					}
					node=node.parentNode;
				}
			}
		}catch(e){ /* squelch */ }

		dijit._setStack(newStack, by);
	},

	_onFocusNode: function(/*DomNode*/ node){
		// summary:
		//		Callback when node is focused

		if(!node){
			return;
		}

		if(node.nodeType == 9){
			// Ignore focus events on the document itself.  This is here so that
			// (for example) clicking the up/down arrows of a spinner
			// (which don't get focus) won't cause that widget to blur. (FF issue)
			return;
		}

		dijit._onTouchNode(node);

		if(node == dijit._curFocus){ return; }
		if(dijit._curFocus){
			dijit._prevFocus = dijit._curFocus;
		}
		dijit._curFocus = node;
		dojo.publish("focusNode", [node]);
	},

	_setStack: function(/*String[]*/ newStack, /*String*/ by){
		// summary:
		//		The stack of active widgets has changed.  Send out appropriate events and records new stack.
		// newStack:
		//		array of widget id's, starting from the top (outermost) widget
		// by:
		//		"mouse" if the focus/touch was caused by a mouse down event

		var oldStack = dijit._activeStack;
		dijit._activeStack = newStack;

		// compare old stack to new stack to see how many elements they have in common
		for(var nCommon=0; nCommon<Math.min(oldStack.length, newStack.length); nCommon++){
			if(oldStack[nCommon] != newStack[nCommon]){
				break;
			}
		}

		var widget;
		// for all elements that have gone out of focus, send blur event
		for(var i=oldStack.length-1; i>=nCommon; i--){
			widget = dijit.byId(oldStack[i]);
			if(widget){
				widget._focused = false;
				widget.set("focused", false);
				widget._hasBeenBlurred = true;
				if(widget._onBlur){
					widget._onBlur(by);
				}
				dojo.publish("widgetBlur", [widget, by]);
			}
		}

		// for all element that have come into focus, send focus event
		for(i=nCommon; i<newStack.length; i++){
			widget = dijit.byId(newStack[i]);
			if(widget){
				widget._focused = true;
				widget.set("focused", true);
				if(widget._onFocus){
					widget._onFocus(by);
				}
				dojo.publish("widgetFocus", [widget, by]);
			}
		}
	}
});

// register top window and all the iframes it contains
dojo.addOnLoad(function(){
	var handle = dijit.registerWin(window);
	if(dojo.isIE){
		dojo.addOnWindowUnload(function(){
			dijit.unregisterWin(handle);
			handle = null;
		})
	}
});

}

if(!dojo._hasResource["dojo.AdapterRegistry"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.AdapterRegistry"] = true;
dojo.provide("dojo.AdapterRegistry");


dojo.AdapterRegistry = function(/*Boolean?*/ returnWrappers){
	//	summary:
	//		A registry to make contextual calling/searching easier.
	//	description:
	//		Objects of this class keep list of arrays in the form [name, check,
	//		wrap, directReturn] that are used to determine what the contextual
	//		result of a set of checked arguments is. All check/wrap functions
	//		in this registry should be of the same arity.
	//	example:
	//	|	// create a new registry
	//	|	var reg = new dojo.AdapterRegistry();
	//	|	reg.register("handleString",
	//	|		dojo.isString,
	//	|		function(str){
	//	|			// do something with the string here
	//	|		}
	//	|	);
	//	|	reg.register("handleArr",
	//	|		dojo.isArray,
	//	|		function(arr){
	//	|			// do something with the array here
	//	|		}
	//	|	);
	//	|
	//	|	// now we can pass reg.match() *either* an array or a string and
	//	|	// the value we pass will get handled by the right function
	//	|	reg.match("someValue"); // will call the first function
	//	|	reg.match(["someValue"]); // will call the second

	this.pairs = [];
	this.returnWrappers = returnWrappers || false; // Boolean
};

dojo.extend(dojo.AdapterRegistry, {
	register: function(/*String*/ name, /*Function*/ check, /*Function*/ wrap, /*Boolean?*/ directReturn, /*Boolean?*/ override){
		//	summary:
		//		register a check function to determine if the wrap function or
		//		object gets selected
		//	name:
		//		a way to identify this matcher.
		//	check:
		//		a function that arguments are passed to from the adapter's
		//		match() function.  The check function should return true if the
		//		given arguments are appropriate for the wrap function.
		//	directReturn:
		//		If directReturn is true, the value passed in for wrap will be
		//		returned instead of being called. Alternately, the
		//		AdapterRegistry can be set globally to "return not call" using
		//		the returnWrappers property. Either way, this behavior allows
		//		the registry to act as a "search" function instead of a
		//		function interception library.
		//	override:
		//		If override is given and true, the check function will be given
		//		highest priority. Otherwise, it will be the lowest priority
		//		adapter.
		this.pairs[((override) ? "unshift" : "push")]([name, check, wrap, directReturn]);
	},

	match: function(/* ... */){
		// summary:
		//		Find an adapter for the given arguments. If no suitable adapter
		//		is found, throws an exception. match() accepts any number of
		//		arguments, all of which are passed to all matching functions
		//		from the registered pairs.
		for(var i = 0; i < this.pairs.length; i++){
			var pair = this.pairs[i];
			if(pair[1].apply(this, arguments)){
				if((pair[3])||(this.returnWrappers)){
					return pair[2];
				}else{
					return pair[2].apply(this, arguments);
				}
			}
		}
		throw new Error("No match found");
	},

	unregister: function(name){
		// summary: Remove a named adapter from the registry

		// FIXME: this is kind of a dumb way to handle this. On a large
		// registry this will be slow-ish and we can use the name as a lookup
		// should we choose to trade memory for speed.
		for(var i = 0; i < this.pairs.length; i++){
			var pair = this.pairs[i];
			if(pair[0] == name){
				this.pairs.splice(i, 1);
				return true;
			}
		}
		return false;
	}
});

}

if(!dojo._hasResource["dijit._base.place"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.place"] = true;
dojo.provide("dijit._base.place");




dijit.getViewport = function(){
	// summary:
	//		Returns the dimensions and scroll position of the viewable area of a browser window

	return dojo.window.getBox();
};

/*=====
dijit.__Position = function(){
	// x: Integer
	//		horizontal coordinate in pixels, relative to document body
	// y: Integer
	//		vertical coordinate in pixels, relative to document body

	thix.x = x;
	this.y = y;
}
=====*/


dijit.placeOnScreen = function(
	/* DomNode */			node,
	/* dijit.__Position */	pos,
	/* String[] */			corners,
	/* dijit.__Position? */	padding){
	// summary:
	//		Positions one of the node's corners at specified position
	//		such that node is fully visible in viewport.
	// description:
	//		NOTE: node is assumed to be absolutely or relatively positioned.
	//	pos:
	//		Object like {x: 10, y: 20}
	//	corners:
	//		Array of Strings representing order to try corners in, like ["TR", "BL"].
	//		Possible values are:
	//			* "BL" - bottom left
	//			* "BR" - bottom right
	//			* "TL" - top left
	//			* "TR" - top right
	//	padding:
	//		set padding to put some buffer around the element you want to position.
	// example:
	//		Try to place node's top right corner at (10,20).
	//		If that makes node go (partially) off screen, then try placing
	//		bottom left corner at (10,20).
	//	|	placeOnScreen(node, {x: 10, y: 20}, ["TR", "BL"])

	var choices = dojo.map(corners, function(corner){
		var c = { corner: corner, pos: {x:pos.x,y:pos.y} };
		if(padding){
			c.pos.x += corner.charAt(1) == 'L' ? padding.x : -padding.x;
			c.pos.y += corner.charAt(0) == 'T' ? padding.y : -padding.y;
		}
		return c;
	});

	return dijit._place(node, choices);
}

dijit._place = function(/*DomNode*/ node, choices, layoutNode, /*Object*/ aroundNodeCoords){
	// summary:
	//		Given a list of spots to put node, put it at the first spot where it fits,
	//		of if it doesn't fit anywhere then the place with the least overflow
	// choices: Array
	//		Array of elements like: {corner: 'TL', pos: {x: 10, y: 20} }
	//		Above example says to put the top-left corner of the node at (10,20)
	// layoutNode: Function(node, aroundNodeCorner, nodeCorner, size)
	//		for things like tooltip, they are displayed differently (and have different dimensions)
	//		based on their orientation relative to the parent.   This adjusts the popup based on orientation.
	//		It also passes in the available size for the popup, which is useful for tooltips to
	//		tell them that their width is limited to a certain amount.   layoutNode() may return a value expressing
	//		how much the popup had to be modified to fit into the available space.   This is used to determine
	//		what the best placement is.
	// aroundNodeCoords: Object
	//		Size of aroundNode, ex: {w: 200, h: 50}

	// get {x: 10, y: 10, w: 100, h:100} type obj representing position of
	// viewport over document
	var view = dojo.window.getBox();

	// This won't work if the node is inside a <div style="position: relative">,
	// so reattach it to dojo.doc.body.   (Otherwise, the positioning will be wrong
	// and also it might get cutoff)
	if(!node.parentNode || String(node.parentNode.tagName).toLowerCase() != "body"){
		dojo.body().appendChild(node);
	}

	var best = null;
	dojo.some(choices, function(choice){
		var corner = choice.corner;
		var pos = choice.pos;
		var overflow = 0;

		// calculate amount of space available given specified position of node
		var spaceAvailable = {
			w: corner.charAt(1) == 'L' ? (view.l + view.w) - pos.x : pos.x - view.l,
			h: corner.charAt(1) == 'T' ? (view.t + view.h) - pos.y : pos.y - view.t
		};

		// configure node to be displayed in given position relative to button
		// (need to do this in order to get an accurate size for the node, because
		// a tooltip's size changes based on position, due to triangle)
		if(layoutNode){
			var res = layoutNode(node, choice.aroundCorner, corner, spaceAvailable, aroundNodeCoords);
			overflow = typeof res == "undefined" ? 0 : res;
		}

		// get node's size
		var style = node.style;
		var oldDisplay = style.display;
		var oldVis = style.visibility;
		style.visibility = "hidden";
		style.display = "";
		var mb = dojo.marginBox(node);
		style.display = oldDisplay;
		style.visibility = oldVis;

		// coordinates and size of node with specified corner placed at pos,
		// and clipped by viewport
		var startX = Math.max(view.l, corner.charAt(1) == 'L' ? pos.x : (pos.x - mb.w)),
			startY = Math.max(view.t, corner.charAt(0) == 'T' ? pos.y : (pos.y - mb.h)),
			endX = Math.min(view.l + view.w, corner.charAt(1) == 'L' ? (startX + mb.w) : pos.x),
			endY = Math.min(view.t + view.h, corner.charAt(0) == 'T' ? (startY + mb.h) : pos.y),
			width = endX - startX,
			height = endY - startY;

		overflow += (mb.w - width) + (mb.h - height);

		if(best == null || overflow < best.overflow){
			best = {
				corner: corner,
				aroundCorner: choice.aroundCorner,
				x: startX,
				y: startY,
				w: width,
				h: height,
				overflow: overflow,
				spaceAvailable: spaceAvailable
			};
		}
		
		return !overflow;
	});

	// In case the best position is not the last one we checked, need to call
	// layoutNode() again.
	if(best.overflow && layoutNode){
		layoutNode(node, best.aroundCorner, best.corner, best.spaceAvailable, aroundNodeCoords);
	}

	// And then position the node.   Do this last, after the layoutNode() above
	// has sized the node, due to browser quirks when the viewport is scrolled
	// (specifically that a Tooltip will shrink to fit as though the window was
	// scrolled to the left).
	//
	// In RTL mode, set style.right rather than style.left so in the common case,
	// window resizes move the popup along with the aroundNode.
	var l = dojo._isBodyLtr(),
		s = node.style;
	s.top = best.y + "px";
	s[l ? "left" : "right"] = (l ? best.x : view.w - best.x - best.w) + "px";
	
	return best;
}

dijit.placeOnScreenAroundNode = function(
	/* DomNode */		node,
	/* DomNode */		aroundNode,
	/* Object */		aroundCorners,
	/* Function? */		layoutNode){

	// summary:
	//		Position node adjacent or kitty-corner to aroundNode
	//		such that it's fully visible in viewport.
	//
	// description:
	//		Place node such that corner of node touches a corner of
	//		aroundNode, and that node is fully visible.
	//
	// aroundCorners:
	//		Ordered list of pairs of corners to try matching up.
	//		Each pair of corners is represented as a key/value in the hash,
	//		where the key corresponds to the aroundNode's corner, and
	//		the value corresponds to the node's corner:
	//
	//	|	{ aroundNodeCorner1: nodeCorner1, aroundNodeCorner2: nodeCorner2, ...}
	//
	//		The following strings are used to represent the four corners:
	//			* "BL" - bottom left
	//			* "BR" - bottom right
	//			* "TL" - top left
	//			* "TR" - top right
	//
	// layoutNode: Function(node, aroundNodeCorner, nodeCorner)
	//		For things like tooltip, they are displayed differently (and have different dimensions)
	//		based on their orientation relative to the parent.   This adjusts the popup based on orientation.
	//
	// example:
	//	|	dijit.placeOnScreenAroundNode(node, aroundNode, {'BL':'TL', 'TR':'BR'});
	//		This will try to position node such that node's top-left corner is at the same position
	//		as the bottom left corner of the aroundNode (ie, put node below
	//		aroundNode, with left edges aligned).  If that fails it will try to put
	// 		the bottom-right corner of node where the top right corner of aroundNode is
	//		(ie, put node above aroundNode, with right edges aligned)
	//

	// get coordinates of aroundNode
	aroundNode = dojo.byId(aroundNode);
	var aroundNodePos = dojo.position(aroundNode, true);

	// place the node around the calculated rectangle
	return dijit._placeOnScreenAroundRect(node,
		aroundNodePos.x, aroundNodePos.y, aroundNodePos.w, aroundNodePos.h,	// rectangle
		aroundCorners, layoutNode);
};

/*=====
dijit.__Rectangle = function(){
	// x: Integer
	//		horizontal offset in pixels, relative to document body
	// y: Integer
	//		vertical offset in pixels, relative to document body
	// width: Integer
	//		width in pixels
	// height: Integer
	//		height in pixels

	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
}
=====*/


dijit.placeOnScreenAroundRectangle = function(
	/* DomNode */			node,
	/* dijit.__Rectangle */	aroundRect,
	/* Object */			aroundCorners,
	/* Function */			layoutNode){

	// summary:
	//		Like dijit.placeOnScreenAroundNode(), except that the "around"
	//		parameter is an arbitrary rectangle on the screen (x, y, width, height)
	//		instead of a dom node.

	return dijit._placeOnScreenAroundRect(node,
		aroundRect.x, aroundRect.y, aroundRect.width, aroundRect.height,	// rectangle
		aroundCorners, layoutNode);
};

dijit._placeOnScreenAroundRect = function(
	/* DomNode */		node,
	/* Number */		x,
	/* Number */		y,
	/* Number */		width,
	/* Number */		height,
	/* Object */		aroundCorners,
	/* Function */		layoutNode){

	// summary:
	//		Like dijit.placeOnScreenAroundNode(), except it accepts coordinates
	//		of a rectangle to place node adjacent to.

	// TODO: combine with placeOnScreenAroundRectangle()

	// Generate list of possible positions for node
	var choices = [];
	for(var nodeCorner in aroundCorners){
		choices.push( {
			aroundCorner: nodeCorner,
			corner: aroundCorners[nodeCorner],
			pos: {
				x: x + (nodeCorner.charAt(1) == 'L' ? 0 : width),
				y: y + (nodeCorner.charAt(0) == 'T' ? 0 : height)
			}
		});
	}

	return dijit._place(node, choices, layoutNode, {w: width, h: height});
};

dijit.placementRegistry= new dojo.AdapterRegistry();
dijit.placementRegistry.register("node",
	function(n, x){
		return typeof x == "object" &&
			typeof x.offsetWidth != "undefined" && typeof x.offsetHeight != "undefined";
	},
	dijit.placeOnScreenAroundNode);
dijit.placementRegistry.register("rect",
	function(n, x){
		return typeof x == "object" &&
			"x" in x && "y" in x && "width" in x && "height" in x;
	},
	dijit.placeOnScreenAroundRectangle);

dijit.placeOnScreenAroundElement = function(
	/* DomNode */		node,
	/* Object */		aroundElement,
	/* Object */		aroundCorners,
	/* Function */		layoutNode){

	// summary:
	//		Like dijit.placeOnScreenAroundNode(), except it accepts an arbitrary object
	//		for the "around" argument and finds a proper processor to place a node.

	return dijit.placementRegistry.match.apply(dijit.placementRegistry, arguments);
};

dijit.getPopupAroundAlignment = function(/*Array*/ position, /*Boolean*/ leftToRight){
	// summary:
	//		Transforms the passed array of preferred positions into a format suitable for passing as the aroundCorners argument to dijit.placeOnScreenAroundElement.
	//
	// position: String[]
	//		This variable controls the position of the drop down.
	//		It's an array of strings with the following values:
	//
	//			* before: places drop down to the left of the target node/widget, or to the right in
	//			  the case of RTL scripts like Hebrew and Arabic
	//			* after: places drop down to the right of the target node/widget, or to the left in
	//			  the case of RTL scripts like Hebrew and Arabic
	//			* above: drop down goes above target node
	//			* below: drop down goes below target node
	//
	//		The list is positions is tried, in order, until a position is found where the drop down fits
	//		within the viewport.
	//
	// leftToRight: Boolean
	//		Whether the popup will be displaying in leftToRight mode.
	//
	var align = {};
	dojo.forEach(position, function(pos){
		switch(pos){
			case "after":
				align[leftToRight ? "BR" : "BL"] = leftToRight ? "BL" : "BR";
				break;
			case "before":
				align[leftToRight ? "BL" : "BR"] = leftToRight ? "BR" : "BL";
				break;
			case "below-alt":
				leftToRight = !leftToRight;
				// fall through
			case "below":
				// first try to align left borders, next try to align right borders (or reverse for RTL mode)
				align[leftToRight ? "BL" : "BR"] = leftToRight ? "TL" : "TR";
				align[leftToRight ? "BR" : "BL"] = leftToRight ? "TR" : "TL";
				break;
			case "above-alt":
				leftToRight = !leftToRight;
				// fall through
			case "above":
			default:
				// first try to align left borders, next try to align right borders (or reverse for RTL mode)
				align[leftToRight ? "TL" : "TR"] = leftToRight ? "BL" : "BR";
				align[leftToRight ? "TR" : "TL"] = leftToRight ? "BR" : "BL";
				break;
		}
	});
	return align;
};

}

if(!dojo._hasResource["dijit._base.window"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.window"] = true;
dojo.provide("dijit._base.window");



dijit.getDocumentWindow = function(doc){
	return dojo.window.get(doc);
};

}

if(!dojo._hasResource["dijit._base.popup"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.popup"] = true;
dojo.provide("dijit._base.popup");





/*=====
dijit.popup.__OpenArgs = function(){
	// popup: Widget
	//		widget to display
	// parent: Widget
	//		the button etc. that is displaying this popup
	// around: DomNode
	//		DOM node (typically a button); place popup relative to this node.  (Specify this *or* "x" and "y" parameters.)
	// x: Integer
	//		Absolute horizontal position (in pixels) to place node at.  (Specify this *or* "around" parameter.)
	// y: Integer
	//		Absolute vertical position (in pixels) to place node at.  (Specify this *or* "around" parameter.)
	// orient: Object|String
	//		When the around parameter is specified, orient should be an
	//		ordered list of tuples of the form (around-node-corner, popup-node-corner).
	//		dijit.popup.open() tries to position the popup according to each tuple in the list, in order,
	//		until the popup appears fully within the viewport.
	//
	//		The default value is {BL:'TL', TL:'BL'}, which represents a list of two tuples:
	//			1. (BL, TL)
	//			2. (TL, BL)
	//		where BL means "bottom left" and "TL" means "top left".
	//		So by default, it first tries putting the popup below the around node, left-aligning them,
	//		and then tries to put it above the around node, still left-aligning them.   Note that the
	//		default is horizontally reversed when in RTL mode.
	//
	//		When an (x,y) position is specified rather than an around node, orient is either
	//		"R" or "L".  R (for right) means that it tries to put the popup to the right of the mouse,
	//		specifically positioning the popup's top-right corner at the mouse position, and if that doesn't
	//		fit in the viewport, then it tries, in order, the bottom-right corner, the top left corner,
	//		and the top-right corner.
	// onCancel: Function
	//		callback when user has canceled the popup by
	//			1. hitting ESC or
	//			2. by using the popup widget's proprietary cancel mechanism (like a cancel button in a dialog);
	//			   i.e. whenever popupWidget.onCancel() is called, args.onCancel is called
	// onClose: Function
	//		callback whenever this popup is closed
	// onExecute: Function
	//		callback when user "executed" on the popup/sub-popup by selecting a menu choice, etc. (top menu only)
	// padding: dijit.__Position
	//		adding a buffer around the opening position. This is only useful when around is not set.
	this.popup = popup;
	this.parent = parent;
	this.around = around;
	this.x = x;
	this.y = y;
	this.orient = orient;
	this.onCancel = onCancel;
	this.onClose = onClose;
	this.onExecute = onExecute;
	this.padding = padding;
}
=====*/

dijit.popup = {
	// summary:
	//		This singleton is used to show/hide widgets as popups.

	// _stack: dijit._Widget[]
	//		Stack of currently popped up widgets.
	//		(someone opened _stack[0], and then it opened _stack[1], etc.)
	_stack: [],
	
	// _beginZIndex: Number
	//		Z-index of the first popup.   (If first popup opens other
	//		popups they get a higher z-index.)
	_beginZIndex: 1000,

	_idGen: 1,

	_createWrapper: function(/*Widget || DomNode*/ widget){
		// summary:
		//		Initialization for widgets that will be used as popups.
		//		Puts widget inside a wrapper DIV (if not already in one),
		//		and returns pointer to that wrapper DIV.

		var wrapper = widget.declaredClass ? widget._popupWrapper : (widget.parentNode && dojo.hasClass(widget.parentNode, "dijitPopup")),
			node = widget.domNode || widget;

		if(!wrapper){
			// Create wrapper <div> for when this widget [in the future] will be used as a popup.
			// This is done early because of IE bugs where creating/moving DOM nodes causes focus
			// to go wonky, see tests/robot/Toolbar.html to reproduce
			wrapper = dojo.create("div",{
				"class":"dijitPopup",
				style:{ display: "none"},
				role: "presentation"
			}, dojo.body());
			wrapper.appendChild(node);

			var s = node.style;
			s.display = "";
			s.visibility = "";
			s.position = "";
			s.top = "0px";

			if(widget.declaredClass){		// TODO: in 2.0 change signature to always take widget, then remove if()
				widget._popupWrapper = wrapper;
				dojo.connect(widget, "destroy", function(){
					dojo.destroy(wrapper);
					delete widget._popupWrapper;
				});
			}
		}
		
		return wrapper;
	},

	moveOffScreen: function(/*Widget || DomNode*/ widget){
		// summary:
		//		Moves the popup widget off-screen.
		//		Do not use this method to hide popups when not in use, because
		//		that will create an accessibility issue: the offscreen popup is
		//		still in the tabbing order.

		// Create wrapper if not already there
		var wrapper = this._createWrapper(widget);

		dojo.style(wrapper, {
			visibility: "hidden",
			top: "-9999px",		// prevent transient scrollbar causing misalign (#5776), and initial flash in upper left (#10111)
			display: ""
		});
	},

	hide: function(/*dijit._Widget*/ widget){
		// summary:
		//		Hide this popup widget (until it is ready to be shown).
		//		Initialization for widgets that will be used as popups
		//
		// 		Also puts widget inside a wrapper DIV (if not already in one)
		//
		//		If popup widget needs to layout it should
		//		do so when it is made visible, and popup._onShow() is called.

		// Create wrapper if not already there
		var wrapper = this._createWrapper(widget);

		dojo.style(wrapper, "display", "none");
	},
		
	getTopPopup: function(){
		// summary:
		//		Compute the closest ancestor popup that's *not* a child of another popup.
		//		Ex: For a TooltipDialog with a button that spawns a tree of menus, find the popup of the button.
		var stack = this._stack;
		for(var pi=stack.length-1; pi > 0 && stack[pi].parent === stack[pi-1].widget; pi--){
			/* do nothing, just trying to get right value for pi */
		}
		return stack[pi];
	},

	open: function(/*dijit.popup.__OpenArgs*/ args){
		// summary:
		//		Popup the widget at the specified position
		//
		// example:
		//		opening at the mouse position
		//		|		dijit.popup.open({popup: menuWidget, x: evt.pageX, y: evt.pageY});
		//
		// example:
		//		opening the widget as a dropdown
		//		|		dijit.popup.open({parent: this, popup: menuWidget, around: this.domNode, onClose: function(){...}});
		//
		//		Note that whatever widget called dijit.popup.open() should also listen to its own _onBlur callback
		//		(fired from _base/focus.js) to know that focus has moved somewhere else and thus the popup should be closed.

		var stack = this._stack,
			widget = args.popup,
			orient = args.orient || (
				(args.parent ? args.parent.isLeftToRight() : dojo._isBodyLtr()) ?
				{'BL':'TL', 'BR':'TR', 'TL':'BL', 'TR':'BR'} :
				{'BR':'TR', 'BL':'TL', 'TR':'BR', 'TL':'BL'}
			),
			around = args.around,
			id = (args.around && args.around.id) ? (args.around.id+"_dropdown") : ("popup_"+this._idGen++);

		// If we are opening a new popup that isn't a child of a currently opened popup, then
		// close currently opened popup(s).   This should happen automatically when the old popups
		// gets the _onBlur() event, except that the _onBlur() event isn't reliable on IE, see [22198].
		while(stack.length && (!args.parent || !dojo.isDescendant(args.parent.domNode, stack[stack.length-1].widget.domNode))){
			dijit.popup.close(stack[stack.length-1].widget);
		}

		// Get pointer to popup wrapper, and create wrapper if it doesn't exist
		var wrapper = this._createWrapper(widget);


		dojo.attr(wrapper, {
			id: id,
			style: {
				zIndex: this._beginZIndex + stack.length
			},
			"class": "dijitPopup " + (widget.baseClass || widget["class"] || "").split(" ")[0] +"Popup",
			dijitPopupParent: args.parent ? args.parent.id : ""
		});

		if(dojo.isIE || dojo.isMoz){
			if(!widget.bgIframe){
				// setting widget.bgIframe triggers cleanup in _Widget.destroy()
				widget.bgIframe = new dijit.BackgroundIframe(wrapper);
			}
		}

		// position the wrapper node and make it visible
		var best = around ?
			dijit.placeOnScreenAroundElement(wrapper, around, orient, widget.orient ? dojo.hitch(widget, "orient") : null) :
			dijit.placeOnScreen(wrapper, args, orient == 'R' ? ['TR','BR','TL','BL'] : ['TL','BL','TR','BR'], args.padding);

		wrapper.style.display = "";
		wrapper.style.visibility = "visible";
		widget.domNode.style.visibility = "visible";	// counteract effects from _HasDropDown

		var handlers = [];

		// provide default escape and tab key handling
		// (this will work for any widget, not just menu)
		handlers.push(dojo.connect(wrapper, "onkeypress", this, function(evt){
			if(evt.charOrCode == dojo.keys.ESCAPE && args.onCancel){
				dojo.stopEvent(evt);
				args.onCancel();
			}else if(evt.charOrCode === dojo.keys.TAB){
				dojo.stopEvent(evt);
				var topPopup = this.getTopPopup();
				if(topPopup && topPopup.onCancel){
					topPopup.onCancel();
				}
			}
		}));

		// watch for cancel/execute events on the popup and notify the caller
		// (for a menu, "execute" means clicking an item)
		if(widget.onCancel){
			handlers.push(dojo.connect(widget, "onCancel", args.onCancel));
		}

		handlers.push(dojo.connect(widget, widget.onExecute ? "onExecute" : "onChange", this, function(){
			var topPopup = this.getTopPopup();
			if(topPopup && topPopup.onExecute){
				topPopup.onExecute();
			}
		}));

		stack.push({
			widget: widget,
			parent: args.parent,
			onExecute: args.onExecute,
			onCancel: args.onCancel,
 			onClose: args.onClose,
			handlers: handlers
		});

		if(widget.onOpen){
			// TODO: in 2.0 standardize onShow() (used by StackContainer) and onOpen() (used here)
			widget.onOpen(best);
		}

		return best;
	},

	close: function(/*dijit._Widget?*/ popup){
		// summary:
		//		Close specified popup and any popups that it parented.
		//		If no popup is specified, closes all popups.

		var stack = this._stack;

		// Basically work backwards from the top of the stack closing popups
		// until we hit the specified popup, but IIRC there was some issue where closing
		// a popup would cause others to close too.  Thus if we are trying to close B in [A,B,C]
		// closing C might close B indirectly and then the while() condition will run where stack==[A]...
		// so the while condition is constructed defensively.
		while((popup && dojo.some(stack, function(elem){return elem.widget == popup;})) ||
			(!popup && stack.length)){
			var top = stack.pop(),
				widget = top.widget,
				onClose = top.onClose;

			if(widget.onClose){
				// TODO: in 2.0 standardize onHide() (used by StackContainer) and onClose() (used here)
				widget.onClose();
			}
			dojo.forEach(top.handlers, dojo.disconnect);

			// Hide the widget and it's wrapper unless it has already been destroyed in above onClose() etc.
			if(widget && widget.domNode){
				this.hide(widget);
			}
                        
			if(onClose){
				onClose();
			}
		}
	}
};

// TODO: remove dijit._frames, it isn't being used much, since popups never release their
// iframes (see [22236])
dijit._frames = new function(){
	// summary:
	//		cache of iframes

	var queue = [];

	this.pop = function(){
		var iframe;
		if(queue.length){
			iframe = queue.pop();
			iframe.style.display="";
		}else{
			if(dojo.isIE < 9){
				var burl = dojo.config["dojoBlankHtmlUrl"] || (dojo.moduleUrl("dojo", "resources/blank.html")+"") || "javascript:\"\"";
				var html="<iframe src='" + burl + "'"
					+ " style='position: absolute; left: 0px; top: 0px;"
					+ "z-index: -1; filter:Alpha(Opacity=\"0\");'>";
				iframe = dojo.doc.createElement(html);
			}else{
			 	iframe = dojo.create("iframe");
				iframe.src = 'javascript:""';
				iframe.className = "dijitBackgroundIframe";
				dojo.style(iframe, "opacity", 0.1);
			}
			iframe.tabIndex = -1; // Magic to prevent iframe from getting focus on tab keypress - as style didn't work.
			dijit.setWaiRole(iframe,"presentation");
		}
		return iframe;
	};

	this.push = function(iframe){
		iframe.style.display="none";
		queue.push(iframe);
	}
}();


dijit.BackgroundIframe = function(/*DomNode*/ node){
	// summary:
	//		For IE/FF z-index schenanigans. id attribute is required.
	//
	// description:
	//		new dijit.BackgroundIframe(node)
	//			Makes a background iframe as a child of node, that fills
	//			area (and position) of node

	if(!node.id){ throw new Error("no id"); }
	if(dojo.isIE || dojo.isMoz){
		var iframe = (this.iframe = dijit._frames.pop());
		node.appendChild(iframe);
		if(dojo.isIE<7 || dojo.isQuirks){
			this.resize(node);
			this._conn = dojo.connect(node, 'onresize', this, function(){
				this.resize(node);
			});
		}else{
			dojo.style(iframe, {
				width: '100%',
				height: '100%'
			});
		}
	}
};

dojo.extend(dijit.BackgroundIframe, {
	resize: function(node){
		// summary:
		// 		Resize the iframe so it's the same size as node.
		//		Needed on IE6 and IE/quirks because height:100% doesn't work right.
		if(this.iframe){
			dojo.style(this.iframe, {
				width: node.offsetWidth + 'px',
				height: node.offsetHeight + 'px'
			});
		}
	},
	destroy: function(){
		// summary:
		//		destroy the iframe
		if(this._conn){
			dojo.disconnect(this._conn);
			this._conn = null;
		}
		if(this.iframe){
			dijit._frames.push(this.iframe);
			delete this.iframe;
		}
	}
});

}

if(!dojo._hasResource["dijit._base.scroll"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.scroll"] = true;
dojo.provide("dijit._base.scroll");



dijit.scrollIntoView = function(/*DomNode*/ node, /*Object?*/ pos){
	// summary:
	//		Scroll the passed node into view, if it is not already.
	//		Deprecated, use `dojo.window.scrollIntoView` instead.
	
	dojo.window.scrollIntoView(node, pos);
};

}

if(!dojo._hasResource["dojo.uacss"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.uacss"] = true;
dojo.provide("dojo.uacss");


(function(){
	// summary:
	//		Applies pre-set CSS classes to the top-level HTML node, based on:
	// 			- browser (ex: dj_ie)
	//			- browser version (ex: dj_ie6)
	//			- box model (ex: dj_contentBox)
	//			- text direction (ex: dijitRtl)
	//
	//		In addition, browser, browser version, and box model are
	//		combined with an RTL flag when browser text is RTL.  ex: dj_ie-rtl.

	var d = dojo,
		html = d.doc.documentElement,
		ie = d.isIE,
		opera = d.isOpera,
		maj = Math.floor,
		ff = d.isFF,
		boxModel = d.boxModel.replace(/-/,''),

		classes = {
			dj_ie: ie,
			dj_ie6: maj(ie) == 6,
			dj_ie7: maj(ie) == 7,
			dj_ie8: maj(ie) == 8,
			dj_ie9: maj(ie) == 9,
			dj_quirks: d.isQuirks,
			dj_iequirks: ie && d.isQuirks,

			// NOTE: Opera not supported by dijit
			dj_opera: opera,

			dj_khtml: d.isKhtml,

			dj_webkit: d.isWebKit,
			dj_safari: d.isSafari,
			dj_chrome: d.isChrome,

			dj_gecko: d.isMozilla,
			dj_ff3: maj(ff) == 3
		}; // no dojo unsupported browsers

	classes["dj_" + boxModel] = true;

	// apply browser, browser version, and box model class names
	var classStr = "";
	for(var clz in classes){
		if(classes[clz]){
			classStr += clz + " ";
		}
	}
	html.className = d.trim(html.className + " " + classStr);

	// If RTL mode, then add dj_rtl flag plus repeat existing classes with -rtl extension.
	// We can't run the code below until the <body> tag has loaded (so we can check for dir=rtl).
	// Unshift() is to run sniff code before the parser.
	dojo._loaders.unshift(function(){
		if(!dojo._isBodyLtr()){
			var rtlClassStr = "dj_rtl dijitRtl " + classStr.replace(/ /g, "-rtl ")
			html.className = d.trim(html.className + " " + rtlClassStr);
		}
	});
})();

}

if(!dojo._hasResource["dijit._base.sniff"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.sniff"] = true;
dojo.provide("dijit._base.sniff");



// summary:
//		Applies pre-set CSS classes to the top-level HTML node, see
//		`dojo.uacss` for details.
//
//		Simply doing a require on this module will
//		establish this CSS.  Modified version of Morris' CSS hack.

}

if(!dojo._hasResource["dijit._base.typematic"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.typematic"] = true;
dojo.provide("dijit._base.typematic");


dijit.typematic = {
	// summary:
	//		These functions are used to repetitively call a user specified callback
	//		method when a specific key or mouse click over a specific DOM node is
	//		held down for a specific amount of time.
	//		Only 1 such event is allowed to occur on the browser page at 1 time.

	_fireEventAndReload: function(){
		this._timer = null;
		this._callback(++this._count, this._node, this._evt);
		
		// Schedule next event, timer is at most minDelay (default 10ms) to avoid
		// browser overload (particularly avoiding starving DOH robot so it never gets to send a mouseup)
		this._currentTimeout = Math.max(
			this._currentTimeout < 0 ? this._initialDelay :
				(this._subsequentDelay > 1 ? this._subsequentDelay : Math.round(this._currentTimeout * this._subsequentDelay)),
			this._minDelay);
		this._timer = setTimeout(dojo.hitch(this, "_fireEventAndReload"), this._currentTimeout);
	},

	trigger: function(/*Event*/ evt, /*Object*/ _this, /*DOMNode*/ node, /*Function*/ callback, /*Object*/ obj, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
		// summary:
		//		Start a timed, repeating callback sequence.
		//		If already started, the function call is ignored.
		//		This method is not normally called by the user but can be
		//		when the normal listener code is insufficient.
		// evt:
		//		key or mouse event object to pass to the user callback
		// _this:
		//		pointer to the user's widget space.
		// node:
		//		the DOM node object to pass the the callback function
		// callback:
		//		function to call until the sequence is stopped called with 3 parameters:
		// count:
		//		integer representing number of repeated calls (0..n) with -1 indicating the iteration has stopped
		// node:
		//		the DOM node object passed in
		// evt:
		//		key or mouse event object
		// obj:
		//		user space object used to uniquely identify each typematic sequence
		// subsequentDelay (optional):
		//		if > 1, the number of milliseconds until the 3->n events occur
		//		or else the fractional time multiplier for the next event's delay, default=0.9
		// initialDelay (optional):
		//		the number of milliseconds until the 2nd event occurs, default=500ms
		// minDelay (optional):
		//		the maximum delay in milliseconds for event to fire, default=10ms
		if(obj != this._obj){
			this.stop();
			this._initialDelay = initialDelay || 500;
			this._subsequentDelay = subsequentDelay || 0.90;
			this._minDelay = minDelay || 10;
			this._obj = obj;
			this._evt = evt;
			this._node = node;
			this._currentTimeout = -1;
			this._count = -1;
			this._callback = dojo.hitch(_this, callback);
			this._fireEventAndReload();
			this._evt = dojo.mixin({faux: true}, evt);
		}
	},

	stop: function(){
		// summary:
		//		Stop an ongoing timed, repeating callback sequence.
		if(this._timer){
			clearTimeout(this._timer);
			this._timer = null;
		}
		if(this._obj){
			this._callback(-1, this._node, this._evt);
			this._obj = null;
		}
	},

	addKeyListener: function(/*DOMNode*/ node, /*Object*/ keyObject, /*Object*/ _this, /*Function*/ callback, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
		// summary:
		//		Start listening for a specific typematic key.
		//		See also the trigger method for other parameters.
		// keyObject:
		//		an object defining the key to listen for:
		// 		charOrCode:
		//			the printable character (string) or keyCode (number) to listen for.
		// 		keyCode:
		//			(deprecated - use charOrCode) the keyCode (number) to listen for (implies charCode = 0).
		// 		charCode:
		//			(deprecated - use charOrCode) the charCode (number) to listen for.
		// 		ctrlKey:
		//			desired ctrl key state to initiate the callback sequence:
		//			- pressed (true)
		//			- released (false)
		//			- either (unspecified)
		// 		altKey:
		//			same as ctrlKey but for the alt key
		// 		shiftKey:
		//			same as ctrlKey but for the shift key
		// returns:
		//		an array of dojo.connect handles
		if(keyObject.keyCode){
			keyObject.charOrCode = keyObject.keyCode;
			dojo.deprecated("keyCode attribute parameter for dijit.typematic.addKeyListener is deprecated. Use charOrCode instead.", "", "2.0");
		}else if(keyObject.charCode){
			keyObject.charOrCode = String.fromCharCode(keyObject.charCode);
			dojo.deprecated("charCode attribute parameter for dijit.typematic.addKeyListener is deprecated. Use charOrCode instead.", "", "2.0");
		}
		return [
			dojo.connect(node, "onkeypress", this, function(evt){
				if(evt.charOrCode == keyObject.charOrCode &&
				(keyObject.ctrlKey === undefined || keyObject.ctrlKey == evt.ctrlKey) &&
				(keyObject.altKey === undefined || keyObject.altKey == evt.altKey) &&
				(keyObject.metaKey === undefined || keyObject.metaKey == (evt.metaKey || false)) && // IE doesn't even set metaKey
				(keyObject.shiftKey === undefined || keyObject.shiftKey == evt.shiftKey)){
					dojo.stopEvent(evt);
					dijit.typematic.trigger(evt, _this, node, callback, keyObject, subsequentDelay, initialDelay, minDelay);
				}else if(dijit.typematic._obj == keyObject){
					dijit.typematic.stop();
				}
			}),
			dojo.connect(node, "onkeyup", this, function(evt){
				if(dijit.typematic._obj == keyObject){
					dijit.typematic.stop();
				}
			})
		];
	},

	addMouseListener: function(/*DOMNode*/ node, /*Object*/ _this, /*Function*/ callback, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
		// summary:
		//		Start listening for a typematic mouse click.
		//		See the trigger method for other parameters.
		// returns:
		//		an array of dojo.connect handles
		var dc = dojo.connect;
		return [
			dc(node, "mousedown", this, function(evt){
				dojo.stopEvent(evt);
				dijit.typematic.trigger(evt, _this, node, callback, node, subsequentDelay, initialDelay, minDelay);
			}),
			dc(node, "mouseup", this, function(evt){
				dojo.stopEvent(evt);
				dijit.typematic.stop();
			}),
			dc(node, "mouseout", this, function(evt){
				dojo.stopEvent(evt);
				dijit.typematic.stop();
			}),
			dc(node, "mousemove", this, function(evt){
				evt.preventDefault();
			}),
			dc(node, "dblclick", this, function(evt){
				dojo.stopEvent(evt);
				if(dojo.isIE){
					dijit.typematic.trigger(evt, _this, node, callback, node, subsequentDelay, initialDelay, minDelay);
					setTimeout(dojo.hitch(this, dijit.typematic.stop), 50);
				}
			})
		];
	},

	addListener: function(/*Node*/ mouseNode, /*Node*/ keyNode, /*Object*/ keyObject, /*Object*/ _this, /*Function*/ callback, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
		// summary:
		//		Start listening for a specific typematic key and mouseclick.
		//		This is a thin wrapper to addKeyListener and addMouseListener.
		//		See the addMouseListener and addKeyListener methods for other parameters.
		// mouseNode:
		//		the DOM node object to listen on for mouse events.
		// keyNode:
		//		the DOM node object to listen on for key events.
		// returns:
		//		an array of dojo.connect handles
		return this.addKeyListener(keyNode, keyObject, _this, callback, subsequentDelay, initialDelay, minDelay).concat(
			this.addMouseListener(mouseNode, _this, callback, subsequentDelay, initialDelay, minDelay));
	}
};

}

if(!dojo._hasResource["dijit._base.wai"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.wai"] = true;
dojo.provide("dijit._base.wai");


dijit.wai = {
	onload: function(){
		// summary:
		//		Detects if we are in high-contrast mode or not

		// This must be a named function and not an anonymous
		// function, so that the widget parsing code can make sure it
		// registers its onload function after this function.
		// DO NOT USE "this" within this function.

		// create div for testing if high contrast mode is on or images are turned off
		var div = dojo.create("div",{
			id: "a11yTestNode",
			style:{
				cssText:'border: 1px solid;'
					+ 'border-color:red green;'
					+ 'position: absolute;'
					+ 'height: 5px;'
					+ 'top: -999px;'
					+ 'background-image: url("' + (dojo.config.blankGif || dojo.moduleUrl("dojo", "resources/blank.gif")) + '");'
			}
		}, dojo.body());

		// test it
		var cs = dojo.getComputedStyle(div);
		if(cs){
			var bkImg = cs.backgroundImage;
			var needsA11y = (cs.borderTopColor == cs.borderRightColor) || (bkImg != null && (bkImg == "none" || bkImg == "url(invalid-url:)" ));
			dojo[needsA11y ? "addClass" : "removeClass"](dojo.body(), "dijit_a11y");
			if(dojo.isIE){
				div.outerHTML = "";		// prevent mixed-content warning, see http://support.microsoft.com/kb/925014
			}else{
				dojo.body().removeChild(div);
			}
		}
	}
};

// Test if computer is in high contrast mode.
// Make sure the a11y test runs first, before widgets are instantiated.
if(dojo.isIE || dojo.isMoz){	// NOTE: checking in Safari messes things up
	dojo._loaders.unshift(dijit.wai.onload);
}

dojo.mixin(dijit, {
	hasWaiRole: function(/*Element*/ elem, /*String?*/ role){
		// summary:
		//		Determines if an element has a particular role.
		// returns:
		//		True if elem has the specific role attribute and false if not.
		// 		For backwards compatibility if role parameter not provided,
		// 		returns true if has a role
		var waiRole = this.getWaiRole(elem);
		return role ? (waiRole.indexOf(role) > -1) : (waiRole.length > 0);
	},

	getWaiRole: function(/*Element*/ elem){
		// summary:
		//		Gets the role for an element (which should be a wai role).
		// returns:
		//		The role of elem or an empty string if elem
		//		does not have a role.
		 return dojo.trim((dojo.attr(elem, "role") || "").replace("wairole:",""));
	},

	setWaiRole: function(/*Element*/ elem, /*String*/ role){
		// summary:
		//		Sets the role on an element.
		// description:
		//		Replace existing role attribute with new role.

			dojo.attr(elem, "role", role);
	},

	removeWaiRole: function(/*Element*/ elem, /*String*/ role){
		// summary:
		//		Removes the specified role from an element.
		// 		Removes role attribute if no specific role provided (for backwards compat.)

		var roleValue = dojo.attr(elem, "role");
		if(!roleValue){ return; }
		if(role){
			var t = dojo.trim((" " + roleValue + " ").replace(" " + role + " ", " "));
			dojo.attr(elem, "role", t);
		}else{
			elem.removeAttribute("role");
		}
	},

	hasWaiState: function(/*Element*/ elem, /*String*/ state){
		// summary:
		//		Determines if an element has a given state.
		// description:
		//		Checks for an attribute called "aria-"+state.
		// returns:
		//		true if elem has a value for the given state and
		//		false if it does not.

		return elem.hasAttribute ? elem.hasAttribute("aria-"+state) : !!elem.getAttribute("aria-"+state);
	},

	getWaiState: function(/*Element*/ elem, /*String*/ state){
		// summary:
		//		Gets the value of a state on an element.
		// description:
		//		Checks for an attribute called "aria-"+state.
		// returns:
		//		The value of the requested state on elem
		//		or an empty string if elem has no value for state.

		return elem.getAttribute("aria-"+state) || "";
	},

	setWaiState: function(/*Element*/ elem, /*String*/ state, /*String*/ value){
		// summary:
		//		Sets a state on an element.
		// description:
		//		Sets an attribute called "aria-"+state.

		elem.setAttribute("aria-"+state, value);
	},

	removeWaiState: function(/*Element*/ elem, /*String*/ state){
		// summary:
		//		Removes a state from an element.
		// description:
		//		Sets an attribute called "aria-"+state.

		elem.removeAttribute("aria-"+state);
	}
});

}

if(!dojo._hasResource["dijit._base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base"] = true;
dojo.provide("dijit._base");












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

if(!dojo._hasResource["dojox.mobile.parser"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.parser"] = true;
dojo.provide("dojox.mobile.parser");
dojo.provide("dojo.parser"); // not to load dojo.parser unexpectedly

dojox.mobile.parser = new function(){
	this.instantiate = function(list, defaultParams){
		// summary:
		//		Function for instantiating a list of widget nodes.
		// list:
		//		The list of DOMNodes to walk and instantiate widgets on.
		var ws = [];
		if(list){
			var i, len;
			len = list.length;
			for(i = 0; i < len; i++){
				var node = list[i];
				var cls = dojo.getObject(dojo.attr(node, "dojoType"));
				var proto = cls.prototype;
				var params = {};

				if(defaultParams){
					for(var name in defaultParams){
						params[name] = defaultParams[name];
					}
				}
				for(var prop in proto){
					var val = dojo.attr(node, prop);
					if(!val){ continue; }
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
				params["class"] = node.className;
				params["style"] = node.style && node.style.cssText;
				var instance = new cls(params, node);
				ws.push(instance);
				var jsId = node.getAttribute("jsId");
				if(jsId){
					dojo.setObject(jsId, instance);
				}
			}
			len = ws.length;
			for(i = 0; i < len; i++){
				var w = ws[i];
				w.startup && !w._started && (!w.getParent || !w.getParent()) && w.startup();
			}
		}
		return ws;
	};

	this.parse = function(rootNode, defaultParams){
		// summary:
		//		Function to handle parsing for widgets in the current document.
		//		It is not as powerful as the full dojo parser, but it will handle basic
		//		use cases fine.
		// rootNode:
		//		The root node in the document to parse from
		if(!rootNode){
			rootNode = dojo.body();
		}else if(!defaultParams && rootNode.rootNode){
			// Case where 'rootNode' is really a params object.
			rootNode = rootNode.rootNode;
 		}

		var nodes = rootNode.getElementsByTagName("*");
		var list = [];
		for(var i = 0, len = nodes.length; i < len; i++){
			if(nodes[i].getAttribute("dojoType")){
				list.push(nodes[i]);
			}
		}
		return this.instantiate(list, defaultParams);
	};
}();
dojo._loaders.unshift(function(){
	if(dojo.config.parseOnLoad){
		dojox.mobile.parser.parse();
	}
});


}

if(!dojo._hasResource["dojox.mobile.app._event"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app._event"] = true;
dojo.provide("dojox.mobile.app._event");
dojo.experimental("dojox.mobile.app._event.js");

dojo.mixin(dojox.mobile.app, {
	eventMap: {},

	connectFlick: function(target, context, method){
		// summary:
		//		Listens for a flick event on a DOM node.  If the mouse/touch
		//		moves more than 15 pixels in any given direction it is a flick.
		//		The synthetic event fired specifies the direction as
		//		<ul>
		//			<li><b>'ltr'</b> Left To Right</li>
		//			<li><b>'rtl'</b> Right To Left</li>
		//			<li><b>'ttb'</b> Top To Bottom</li>
		//			<li><b>'btt'</b> Bottom To Top</li>
		//		</ul>
		// target: Node
		//		The DOM node to connect to

		var startX;
		var startY;
		var isFlick = false;

		var currentX;
		var currentY;

		var connMove;
		var connUp;

		var direction;

		var time;

		// Listen to to the mousedown/touchstart event
		var connDown = dojo.connect("onmousedown", target, function(event){
			isFlick = false;
			startX = event.targetTouches ? event.targetTouches[0].clientX : event.clientX;
			startY = event.targetTouches ? event.targetTouches[0].clientY : event.clientY;

			time = (new Date()).getTime();

			connMove = dojo.connect(target, "onmousemove", onMove);
			connUp = dojo.connect(target, "onmouseup", onUp);
		});

		// The function that handles the mousemove/touchmove event
		var onMove = function(event){
			dojo.stopEvent(event);

			currentX = event.targetTouches ? event.targetTouches[0].clientX : event.clientX;
			currentY = event.targetTouches ? event.targetTouches[0].clientY : event.clientY;
			if(Math.abs(Math.abs(currentX) - Math.abs(startX)) > 15){
				isFlick = true;

				direction = (currentX > startX) ? "ltr" : "rtl";
			}else if(Math.abs(Math.abs(currentY) - Math.abs(startY)) > 15){
				isFlick = true;

				direction = (currentY > startY) ? "ttb" : "btt";
			}
		};

		var onUp = function(event){
			dojo.stopEvent(event);

			connMove && dojo.disconnect(connMove);
			connUp && dojo.disconnect(connUp);

			if(isFlick){
				var flickEvt = {
					target: target,
					direction: direction,
					duration: (new Date()).getTime() - time
				};
				if(context && method){
					context[method](flickEvt);
				}else{
					method(flickEvt);
				}
			}
		};

	}
});

dojox.mobile.app.isIPhone = (dojo.isSafari
	&& (navigator.userAgent.indexOf("iPhone") > -1 ||
		navigator.userAgent.indexOf("iPod") > -1
	));
dojox.mobile.app.isWebOS = (navigator.userAgent.indexOf("webOS") > -1);
dojox.mobile.app.isAndroid = (navigator.userAgent.toLowerCase().indexOf("android") > -1);

if(dojox.mobile.app.isIPhone || dojox.mobile.app.isAndroid){
	// We are touchable.
	// Override the dojo._connect function to replace mouse events with touch events

	dojox.mobile.app.eventMap = {
		onmousedown: "ontouchstart",
		mousedown: "ontouchstart",
		onmouseup: "ontouchend",
		mouseup: "ontouchend",
		onmousemove: "ontouchmove",
		mousemove: "ontouchmove"
	};

}
dojo._oldConnect = dojo._connect;
dojo._connect = function(obj, event, context, method, dontFix){
	event = dojox.mobile.app.eventMap[event] || event;
	if(event == "flick" || event == "onflick"){
		if(dojo.global["Mojo"]){
			event = Mojo.Event.flick;
		}else{
			return dojox.mobile.app.connectFlick(obj, context, method);
		}
	}

	return dojo._oldConnect(obj, event, context, method, dontFix);
}

}

if(!dojo._hasResource["dojox.mobile.app._Widget"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app._Widget"] = true;
dojo.provide("dojox.mobile.app._Widget");
dojo.experimental("dojox.mobile.app._Widget");



dojo.declare("dojox.mobile.app._Widget", dijit._WidgetBase, {
	// summary:
	//		The base mobile app widget.

	getScroll: function(){
		// summary:
		//		Returns the scroll position.
		return {
			x: dojo.global.scrollX,
			y: dojo.global.scrollY
		};
	},

	connect: function(target, event, fn){
		if(event.toLowerCase() == "dblclick"
			|| event.toLowerCase() == "ondblclick"){

			if(dojo.global["Mojo"]){
				// Handle webOS tap event
				return this.connect(target, Mojo.Event.tap, fn);
			}
		}
		return this.inherited(arguments);
	}
});

}

if(!dojo._hasResource["dojox.mobile.app.SceneController"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app.SceneController"] = true;
dojo.provide("dojox.mobile.app.SceneController");
dojo.experimental("dojox.mobile.app.SceneController");


(function(){

	var app = dojox.mobile.app;

	var templates = {};

	dojo.declare("dojox.mobile.app.SceneController", dojox.mobile.View, {

		stageController: null,

		keepScrollPos: false,

		init: function(sceneName, params){
			// summary:
			//    Initializes the scene by loading the HTML template and code, if it has
			//    not already been loaded

			this.sceneName = sceneName;
			this.params = params;
			var templateUrl = app.resolveTemplate(sceneName);

			this._deferredInit = new dojo.Deferred();

			if(templates[sceneName]){
				// If the template has been cached, do not load it again.
				this._setContents(templates[sceneName]);
			}else{
				// Otherwise load the template
				dojo.xhrGet({
					url: templateUrl,
					handleAs: "text"
				}).addCallback(dojo.hitch(this, this._setContents));
			}

			return this._deferredInit;
		},

		_setContents: function(templateHtml){
			// summary:
			//    Sets the content of the View, and invokes either the loading or
			//    initialization of the scene assistant.
			templates[this.sceneName] = templateHtml;

			this.domNode.innerHTML = "<div>" + templateHtml + "</div>";

			var sceneAssistantName = "";

			var nameParts = this.sceneName.split("-");

			for(var i = 0; i < nameParts.length; i++){
				sceneAssistantName += nameParts[i].substring(0, 1).toUpperCase()
							+ nameParts[i].substring(1);
			}
			sceneAssistantName += "Assistant";
			this.sceneAssistantName = sceneAssistantName;

			var _this = this;

			dojox.mobile.app.loadResourcesForScene(this.sceneName, function(){

				console.log("All resources for ",_this.sceneName," loaded");

				var assistant;
				if(typeof(dojo.global[sceneAssistantName]) != "undefined"){
					_this._initAssistant();
				}else{
					var assistantUrl = app.resolveAssistant(_this.sceneName);

					dojo.xhrGet({
						url: assistantUrl,
						handleAs: "text"
					}).addCallback(function(text){
						try{
							dojo.eval(text);
						}catch(e){
							console.log("Error initializing code for scene " + _this.sceneName
							+ '. Please check for syntax errors');
							throw e;
						}
						_this._initAssistant();
					});
				}
			});

		},

		_initAssistant: function(){
			// summary:
			//    Initializes the scene assistant. At this point, the View is
			//    populated with the HTML template, and the scene assistant type
			//    is declared.

			console.log("Instantiating the scene assistant " + this.sceneAssistantName);

			var cls = dojo.getObject(this.sceneAssistantName);

			if(!cls){
				throw Error("Unable to resolve scene assistant "
							+ this.sceneAssistantName);
			}

			this.assistant = new cls(this.params);

			this.assistant.controller = this;
			this.assistant.domNode = this.domNode.firstChild;

			this.assistant.setup();

			this._deferredInit.callback();
		},

		query: function(selector, node){
			// summary:
			//    Queries for DOM nodes within either the node passed in as an argument
			//    or within this view.

			return dojo.query(selector, node || this.domNode)
		},

		parse: function(node){
			var widgets = this._widgets =
				dojox.mobile.parser.parse(node || this.domNode, {
					controller: this
				});

			// Tell all widgets what their controller is.
			for(var i = 0; i < widgets.length; i++){
				widgets[i].set("controller", this);
			}
		},

		getWindowSize: function(){
			// TODO, this needs cross browser testing

			return {
				w: dojo.global.innerWidth,
				h: dojo.global.innerHeight
			}
		},

		showAlertDialog: function(props){

			var size = dojo.marginBox(this.assistant.domNode);
			var dialog = new dojox.mobile.app.AlertDialog(
					dojo.mixin(props, {controller: this}));
			this.assistant.domNode.appendChild(dialog.domNode);

			console.log("Appended " , dialog.domNode, " to ", this.assistant.domNode);
			dialog.show();
		},

		popupSubMenu: function(info){
			var widget = new dojox.mobile.app.ListSelector({
				controller: this,
				destroyOnHide: true,
				onChoose: info.onChoose
			});

			this.assistant.domNode.appendChild(widget.domNode);

			widget.set("data", info.choices);
			widget.show(info.fromNode);
		}
	});

})();

}

if(!dojo._hasResource["dojox.mobile.app.StageController"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app.StageController"] = true;
dojo.provide("dojox.mobile.app.StageController");
dojo.experimental("dojox.mobile.app.StageController");



dojo.declare("dojox.mobile.app.StageController", null,{

	// scenes: Array
	//    The list of scenes currently in existance in the app.
	scenes: null,

	effect: "fade",

	constructor: function(node){
		this.domNode = node;
		this.scenes = [];

		if(dojo.config.mobileAnim){
			this.effect = dojo.config.mobileAnim;
		}
	},

	getActiveSceneController: function(){
		return this.scenes[this.scenes.length - 1];
	},

	pushScene: function(sceneName, params){
		if(this._opInProgress){
			return;
		}
		this._opInProgress = true;

		// Push new scenes as the first element on the page.
		var node = dojo.create("div", {
			"class": "scene-wrapper",
			style: {
				visibility: "hidden"
			}
		}, this.domNode);

		var controller = new dojox.mobile.app.SceneController({}, node);

		if(this.scenes.length > 0){
			this.scenes[this.scenes.length -1].assistant.deactivate();
		}

		this.scenes.push(controller);

		var _this = this;

		dojo.forEach(this.scenes, this.setZIndex);

		controller.stageController = this;

		controller.init(sceneName, params).addCallback(function(){

			if(_this.scenes.length == 1){
				controller.domNode.style.visibility = "visible";
				_this.scenes[_this.scenes.length - 1].assistant.activate(params);
				_this._opInProgress = false;
			}else{
				_this.scenes[_this.scenes.length - 2]
					.performTransition(
						_this.scenes[_this.scenes.length - 1].domNode,
						1,
						_this.effect,
						null,
						function(){
							// When the scene is ready, activate it.
							_this.scenes[_this.scenes.length - 1].assistant.activate(params);
							_this._opInProgress = false;
						});
			}
		});
	},

	setZIndex: function(controller, idx){
		dojo.style(controller.domNode, "zIndex", idx + 1);
	},

	popScene: function(data){
		//	performTransition: function(/*String*/moveTo, /*Number*/dir, /*String*/transition,
			//						/*Object|null*/context, /*String|Function*/method /*optional args*/){
		if(this._opInProgress){
			return;
		}

		var _this = this;
		if(this.scenes.length > 1){

			this._opInProgress = true;
			this.scenes[_this.scenes.length - 2].assistant.activate(data);
			this.scenes[_this.scenes.length - 1]
				.performTransition(
					_this.scenes[this.scenes.length - 2].domNode,
					-1,
					this.effect,
					null,
					function(){
						// When the scene is no longer visible, destroy it
						_this._destroyScene(_this.scenes[_this.scenes.length - 1]);
						_this.scenes.splice(_this.scenes.length - 1, 1);
						_this._opInProgress = false;
					});
		}else{
			console.log("cannot pop the scene if there is just one");
		}
	},

	popScenesTo: function(sceneName, data){
		if(this._opInProgress){
			return;
		}

		while(this.scenes.length > 2 &&
				this.scenes[this.scenes.length - 2].sceneName != sceneName){
			this._destroyScene(this.scenes[this.scenes.length - 2]);
			this.scenes.splice(this.scenes.length - 2, 1);
		}

		this.popScene(data);
	},

	_destroyScene: function(scene){
		scene.assistant.deactivate();
		scene.assistant.destroy();
		scene.destroyRecursive();
	}


});


}

if(!dojo._hasResource["dojox.mobile.app.SceneAssistant"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app.SceneAssistant"] = true;
dojo.provide("dojox.mobile.app.SceneAssistant");
dojo.experimental("dojox.mobile.app.SceneAssistant");

dojo.declare("dojox.mobile.app.SceneAssistant", null, {
	// summary:
	//    The base class for all scene assistants.

	constructor: function(){

	},

	setup: function(){
		// summary:
		//    Called to set up the widget.  The UI is not visible at this time

	},

	activate: function(params){
		// summary:
		//    Called each time the scene becomes visible.  This can be as a result
		//    of a new scene being created, or a subsequent scene being destroyed
		//    and control transferring back to this scene assistant.
		// params:
		//    Optional paramters, only passed when a subsequent scene pops itself
		//    off the stack and passes back data.
	},

	deactivate: function(){
		// summary:
		//    Called each time the scene becomes invisible.  This can be as a result
		//    of it being popped off the stack and destroyed,
		//    or another scene being created and pushed on top of it on the stack
	},

	destroy: function(){
	
		var children =
			dojo.query("> [widgetId]", this.containerNode).map(dijit.byNode);
		dojo.forEach(children, function(child){ child.destroyRecursive(); });
	
		this.disconnect();
	},

	connect: function(obj, method, callback){
		if(!this._connects){
			this._connects = [];
		}
		this._connects.push(dojo.connect(obj, method, callback));
	},

	disconnect: function(){
		dojo.forEach(this._connects, dojo.disconnect);
		this._connects = [];
	}
});


}

if(!dojo._hasResource["dojox.mobile.app.AlertDialog"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app.AlertDialog"] = true;
dojo.provide("dojox.mobile.app.AlertDialog");
dojo.experimental("dojox.mobile.app.AlertDialog");


dojo.declare("dojox.mobile.app.AlertDialog", dijit._WidgetBase, {

	// title: String
	//		The title of the AlertDialog
	title: "",

	// text: String
	//		The text message displayed in the AlertDialog
	text: "",

	// controller: Object
	//		The SceneController for the currently active scene
	controller: null,

	// buttons: Array
	buttons: null,

	defaultButtonLabel: "OK",

	// onChoose: Function
	//		The callback function that is invoked when a button is tapped.
	//		If the dialog is cancelled, no parameter is passed to this function.
	onChoose: null,

	constructor: function(){
		this.onClick = dojo.hitch(this, this.onClick);
		this._handleSelect = dojo.hitch(this, this._handleSelect);
	},

	buildRendering: function(){
		this.domNode = dojo.create("div",{
			"class": "alertDialog"
		});

		// Create the outer dialog body
		var dlgBody = dojo.create("div", {"class": "alertDialogBody"}, this.domNode);

		// Create the title
		dojo.create("div", {"class": "alertTitle", innerHTML: this.title || ""}, dlgBody);

		// Create the text
		dojo.create("div", {"class": "alertText", innerHTML: this.text || ""}, dlgBody);

		// Create the node that encapsulates all the buttons
		var btnContainer = dojo.create("div", {"class": "alertBtns"}, dlgBody);

		// If no buttons have been defined, default to a single button saying OK
		if(!this.buttons || this.buttons.length == 0){
			this.buttons = [{
				label: this.defaultButtonLabel,
				value: "ok",
				"class": "affirmative"
			}];
		}

		var _this = this;

		// Create each of the buttons
		dojo.forEach(this.buttons, function(btnInfo){
			var btn = new dojox.mobile.Button({
				btnClass: btnInfo["class"] || "",
				label: btnInfo.label
			});
			btn._dialogValue = btnInfo.value;
			dojo.place(btn.domNode, btnContainer);
			_this.connect(btn, "onClick", _this._handleSelect);
		});

		var viewportSize = this.controller.getWindowSize();

		// Create the mask that blocks out the rest of the screen
		this.mask = dojo.create("div", {"class": "dialogUnderlayWrapper",
			innerHTML: "<div class=\"dialogUnderlay\"></div>",
			style: {
				width: viewportSize.w + "px",
				height: viewportSize.h + "px"
			}
		}, this.controller.assistant.domNode);

		this.connect(this.mask, "onclick", function(){
			_this.onChoose && _this.onChoose();
			_this.hide();
		});
	},

	postCreate: function(){
		this.subscribe("/dojox/mobile/app/goback", this._handleSelect);
	},

	_handleSelect: function(event){
		// summary:
		//		Handle the selection of a value
		var node;
		console.log("handleSelect");
		if(event && event.target){
			node = event.target;

			// Find the widget that was tapped.
			while(!dijit.byNode(node)){
				node - node.parentNode;
			}
		}

		// If an onChoose function was provided, tell it what button
		// value was chosen
		if(this.onChoose){
			this.onChoose(node ? dijit.byNode(node)._dialogValue: undefined);
		}
		// Hide the dialog
		this.hide();
	},

	show: function(){
		// summary:
		//		Show the dialog
		this._doTransition(1);
	},

	hide: function(){
		// summary:
		//		Hide the dialog
		this._doTransition(-1);
	},

	_doTransition: function(dir){
		// summary:
		//		Either shows or hides the dialog.
		// dir:
		//		An integer.  If positive, the dialog is shown. If negative,
		//		the dialog is hidden.

		// TODO: replace this with CSS transitions

		var anim;
		var h = dojo.marginBox(this.domNode.firstChild).h;


		var bodyHeight = this.controller.getWindowSize().h;
		console.log("dialog height = " + h, " body height = " + bodyHeight);

		var high = bodyHeight - h;
		var low = bodyHeight;

		var anim1 = dojo.fx.slideTo({
			node: this.domNode,
			duration: 400,
			top: {start: dir < 0 ? high : low, end: dir < 0 ? low: high}
		});

		var anim2 = dojo[dir < 0 ? "fadeOut" : "fadeIn"]({
			node: this.mask,
			duration: 400
		});

		var anim = dojo.fx.combine([anim1, anim2]);

		var _this = this;

		dojo.connect(anim, "onEnd", this, function(){
			if(dir < 0){
				_this.domNode.style.display = "none";
				dojo.destroy(_this.domNode);
				dojo.destroy(_this.mask);
			}
		});
		anim.play();
	},

	destroy: function(){
		this.inherited(arguments);
		dojo.destroy(this.mask);
	},


	onClick: function(){

	}
});

}

if(!dojo._hasResource["dojo.string"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.string"] = true;
dojo.provide("dojo.string");

dojo.getObject("string", true, dojo);

/*=====
dojo.string = {
	// summary: String utilities for Dojo
};
=====*/

dojo.string.rep = function(/*String*/str, /*Integer*/num){
	//	summary:
	//		Efficiently replicate a string `n` times.
	//	str:
	//		the string to replicate
	//	num:
	//		number of times to replicate the string
	
	if(num <= 0 || !str){ return ""; }
	
	var buf = [];
	for(;;){
		if(num & 1){
			buf.push(str);
		}
		if(!(num >>= 1)){ break; }
		str += str;
	}
	return buf.join("");	// String
};

dojo.string.pad = function(/*String*/text, /*Integer*/size, /*String?*/ch, /*Boolean?*/end){
	//	summary:
	//		Pad a string to guarantee that it is at least `size` length by
	//		filling with the character `ch` at either the start or end of the
	//		string. Pads at the start, by default.
	//	text:
	//		the string to pad
	//	size:
	//		length to provide padding
	//	ch:
	//		character to pad, defaults to '0'
	//	end:
	//		adds padding at the end if true, otherwise pads at start
	//	example:
	//	|	// Fill the string to length 10 with "+" characters on the right.  Yields "Dojo++++++".
	//	|	dojo.string.pad("Dojo", 10, "+", true);

	if(!ch){
		ch = '0';
	}
	var out = String(text),
		pad = dojo.string.rep(ch, Math.ceil((size - out.length) / ch.length));
	return end ? out + pad : pad + out;	// String
};

dojo.string.substitute = function(	/*String*/		template,
									/*Object|Array*/map,
									/*Function?*/	transform,
									/*Object?*/		thisObject){
	//	summary:
	//		Performs parameterized substitutions on a string. Throws an
	//		exception if any parameter is unmatched.
	//	template:
	//		a string with expressions in the form `${key}` to be replaced or
	//		`${key:format}` which specifies a format function. keys are case-sensitive.
	//	map:
	//		hash to search for substitutions
	//	transform:
	//		a function to process all parameters before substitution takes
	//		place, e.g. mylib.encodeXML
	//	thisObject:
	//		where to look for optional format function; default to the global
	//		namespace
	//	example:
	//		Substitutes two expressions in a string from an Array or Object
	//	|	// returns "File 'foo.html' is not found in directory '/temp'."
	//	|	// by providing substitution data in an Array
	//	|	dojo.string.substitute(
	//	|		"File '${0}' is not found in directory '${1}'.",
	//	|		["foo.html","/temp"]
	//	|	);
	//	|
	//	|	// also returns "File 'foo.html' is not found in directory '/temp'."
	//	|	// but provides substitution data in an Object structure.  Dotted
	//	|	// notation may be used to traverse the structure.
	//	|	dojo.string.substitute(
	//	|		"File '${name}' is not found in directory '${info.dir}'.",
	//	|		{ name: "foo.html", info: { dir: "/temp" } }
	//	|	);
	//	example:
	//		Use a transform function to modify the values:
	//	|	// returns "file 'foo.html' is not found in directory '/temp'."
	//	|	dojo.string.substitute(
	//	|		"${0} is not found in ${1}.",
	//	|		["foo.html","/temp"],
	//	|		function(str){
	//	|			// try to figure out the type
	//	|			var prefix = (str.charAt(0) == "/") ? "directory": "file";
	//	|			return prefix + " '" + str + "'";
	//	|		}
	//	|	);
	//	example:
	//		Use a formatter
	//	|	// returns "thinger -- howdy"
	//	|	dojo.string.substitute(
	//	|		"${0:postfix}", ["thinger"], null, {
	//	|			postfix: function(value, key){
	//	|				return value + " -- howdy";
	//	|			}
	//	|		}
	//	|	);

	thisObject = thisObject || dojo.global;
	transform = transform ?
		dojo.hitch(thisObject, transform) : function(v){ return v; };

	return template.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g,
		function(match, key, format){
			var value = dojo.getObject(key, false, map);
			if(format){
				value = dojo.getObject(format, false, thisObject).call(thisObject, value, key);
			}
			return transform(value, key).toString();
		}); // String
};

/*=====
dojo.string.trim = function(str){
	//	summary:
	//		Trims whitespace from both sides of the string
	//	str: String
	//		String to be trimmed
	//	returns: String
	//		Returns the trimmed string
	//	description:
	//		This version of trim() was taken from [Steven Levithan's blog](http://blog.stevenlevithan.com/archives/faster-trim-javascript).
	//		The short yet performant version of this function is dojo.trim(),
	//		which is part of Dojo base.  Uses String.prototype.trim instead, if available.
	return "";	// String
}
=====*/

dojo.string.trim = String.prototype.trim ?
	dojo.trim : // aliasing to the native function
	function(str){
		str = str.replace(/^\s+/, '');
		for(var i = str.length - 1; i >= 0; i--){
			if(/\S/.test(str.charAt(i))){
				str = str.substring(0, i + 1);
				break;
			}
		}
		return str;
	};

}

if(!dojo._hasResource["dojox.mobile.app.List"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app.List"] = true;
dojo.provide("dojox.mobile.app.List");
dojo.experimental("dojox.mobile.app.List");




(function(){

	var templateCache = {};

	dojo.declare("dojox.mobile.app.List", dijit._WidgetBase, {
		// summary:
		//		A templated list widget. Given a simple array of data objects
		//		and a HTML template, it renders a list of elements, with
		//		support for a swipe delete action.  An optional template
		//		can be provided for when the list is empty.

		// items: Array
		//    The array of data items that will be rendered.
		items: null,

		// itemTemplate: String
		//		The URL to the HTML file containing the markup for each individual
		//		data item.
		itemTemplate: "",

		// emptyTemplate: String
		//		The URL to the HTML file containing the HTML to display if there
		//		are no data items. This is optional.
		emptyTemplate: "",

		//  dividerTemplate: String
		//    The URL to the HTML file containing the markup for the dividers
		//    between groups of list items
		dividerTemplate: "",

		// dividerFunction: Function
		//    Function to create divider elements. This should return a divider
		//    value for each item in the list
		dividerFunction: null,

		// labelDelete: String
		//		The label to display for the Delete button
		labelDelete: "Delete",

		// labelCancel: String
		//		The label to display for the Cancel button
		labelCancel: "Cancel",

		// controller: Object
		//
		controller: null,

		// autoDelete: Boolean
		autoDelete: true,

		// enableDelete: Boolean
		enableDelete: true,

		// enableHold: Boolean
		enableHold: true,

		// formatters: Object
		//		A name/value map of functions used to format data for display
		formatters: null,

		// _templateLoadCount: Number
		//		The number of templates remaining to load before the list renders.
		_templateLoadCount: 0,

		// _mouseDownPos: Object
		//    The coordinates of where a mouseDown event was detected
		_mouseDownPos: null,

		baseClass: "list",

		constructor: function(){
			this._checkLoadComplete = dojo.hitch(this, this._checkLoadComplete);
			this._replaceToken = dojo.hitch(this, this._replaceToken);
			this._postDeleteAnim = dojo.hitch(this, this._postDeleteAnim);
		},

		postCreate: function(){

			var _this = this;

			if(this.emptyTemplate){
				this._templateLoadCount++;
			}
			if(this.itemTemplate){
				this._templateLoadCount++;
			}
			if(this.dividerTemplate){
				this._templateLoadCount++;
			}

			this.connect(this.domNode, "onmousedown", function(event){
				var touch = event;
				if(event.targetTouches && event.targetTouches.length > 0){
					touch = event.targetTouches[0];
				}

				// Find the node that was tapped/clicked
				var rowNode = _this._getRowNode(event.target);

				if(rowNode){
					// Add the rows data to the event so it can be picked up
					// by any listeners
					_this._setDataInfo(rowNode, event);

					// Select and highlight the row
					_this._selectRow(rowNode);

					// Record the position that was tapped
					_this._mouseDownPos = {
						x: touch.pageX,
						y: touch.pageY
					};
					_this._dragThreshold = null;
				}
			});

			this.connect(this.domNode, "onmouseup", function(event){
				// When the mouse/finger comes off the list,
				// call the onSelect function and deselect the row.
				if(event.targetTouches && event.targetTouches.length > 0){
					event = event.targetTouches[0];
				}
				var rowNode = _this._getRowNode(event.target);

				if(rowNode){

					_this._setDataInfo(rowNode, event);

					if(_this._selectedRow){
						_this.onSelect(rowNode._data, rowNode._idx, rowNode);
					}

					this._deselectRow();
				}
			});

			// If swipe-to-delete is enabled, listen for the mouse moving
			if(this.enableDelete){
				this.connect(this.domNode, "mousemove", function(event){
					dojo.stopEvent(event);
					if(!_this._selectedRow){
						return;
					}
					var rowNode = _this._getRowNode(event.target);

					// Still check for enableDelete in case it's changed after
					// this listener is added.
					if(_this.enableDelete && rowNode && !_this._deleting){
						_this.handleDrag(event);
					}
				});
			}

			// Put the data and index onto each onclick event.
			this.connect(this.domNode, "onclick", function(event){
				if(event.touches && event.touches.length > 0){
					event = event.touches[0];
				}
				var rowNode = _this._getRowNode(event.target, true);

				if(rowNode){
					_this._setDataInfo(rowNode, event);
				}
			});

			// If the mouse or finger moves off the selected row,
			// deselect it.
			this.connect(this.domNode, "mouseout", function(event){
				if(event.touches && event.touches.length > 0){
					event = event.touches[0];
				}
				if(event.target == _this._selectedRow){
					_this._deselectRow();
				}
			});

			// If no item template has been provided, it is an error.
			if(!this.itemTemplate){
				throw Error("An item template must be provided to " + this.declaredClass);
			}

			// Load the item template
			this._loadTemplate(this.itemTemplate, "itemTemplate", this._checkLoadComplete);

			if(this.emptyTemplate){
				// If the optional empty template has been provided, load it.
				this._loadTemplate(this.emptyTemplate, "emptyTemplate", this._checkLoadComplete);
			}

			if(this.dividerTemplate){
				this._loadTemplate(this.dividerTemplate, "dividerTemplate", this._checkLoadComplete);
			}
		},

		handleDrag: function(event){
			// summary:
			//		Handles rows being swiped for deletion.
			var touch = event;
			if(event.targetTouches && event.targetTouches.length > 0){
				touch = event.targetTouches[0];
			}

			// Get the distance that the mouse or finger has moved since
			// beginning the swipe action.
			var diff = touch.pageX - this._mouseDownPos.x;

			var absDiff = Math.abs(diff);
			if(absDiff > 10 && !this._dragThreshold){
				// Make the user drag the row 60% of the width to remove it
				this._dragThreshold = dojo.marginBox(this._selectedRow).w * 0.6;
				if(!this.autoDelete){
					this.createDeleteButtons(this._selectedRow);
				}
			}

			this._selectedRow.style.left = (absDiff > 10 ? diff : 0) + "px";

			// If the user has dragged the row more than the threshold, slide
			// it off the screen in preparation for deletion.
			if(this._dragThreshold && this._dragThreshold < absDiff){
				this.preDelete(diff);
			}
		},

		handleDragCancel: function(){
			// summary:
			//		Handle a drag action being cancelled, for whatever reason.
			//		Reset handles, remove CSS classes etc.
			if(this._deleting){
				return;
			}
			dojo.removeClass(this._selectedRow, "hold");
			this._selectedRow.style.left = 0;
			this._mouseDownPos = null;
			this._dragThreshold = null;

			this._deleteBtns && dojo.style(this._deleteBtns, "display", "none");
		},

		preDelete: function(currentLeftPos){
			// summary:
			//    Slides the row offscreen before it is deleted

			// TODO: do this with CSS3!
			var self = this;

			this._deleting = true;

			dojo.animateProperty({
				node: this._selectedRow,
				duration: 400,
				properties: {
					left: {
					end: currentLeftPos +
						((currentLeftPos > 0 ? 1 : -1) * this._dragThreshold * 0.8)
					}
				},
				onEnd: dojo.hitch(this, function(){
					if(this.autoDelete){
						this.deleteRow(this._selectedRow);
					}
				})
			}).play();
		},

		deleteRow: function(row){

			// First make the row invisible
			// Put it back where it came from
			dojo.style(row, {
				visibility: "hidden",
				minHeight: "0px"
			});
			dojo.removeClass(row, "hold");

			this._deleteAnimConn =
				this.connect(row, "webkitAnimationEnd", this._postDeleteAnim);

			dojo.addClass(row, "collapsed");
		},

		_postDeleteAnim: function(event){
			// summary:
			//		Completes the deletion of a row.

			if(this._deleteAnimConn){
				this.disconnect(this._deleteAnimConn);
				this._deleteAnimConn = null;
			}

			var row = this._selectedRow;
			var sibling = row.nextSibling;
			var prevSibling = row.previousSibling;

			// If the previous node is a divider and either this is
			// the last element in the list, or the next node is
			// also a divider, remove the divider for the deleted section.
			if(prevSibling && prevSibling._isDivider){
				if(!sibling || sibling._isDivider){
					prevSibling.parentNode.removeChild(prevSibling);
				}
			}

			row.parentNode.removeChild(row);
			this.onDelete(row._data, row._idx, this.items);

			// Decrement the index of each following row
			while(sibling){
				if(sibling._idx){
					sibling._idx--;
				}
				sibling = sibling.nextSibling;
			}

			dojo.destroy(row);

			// Fix up the 'first' and 'last' CSS classes on the rows
			dojo.query("> *:not(.buttons)", this.domNode).forEach(this.applyClass);

			this._deleting = false;
			this._deselectRow();
		},

		createDeleteButtons: function(aroundNode){
			// summary:
			//		Creates the two buttons displayed when confirmation is
			//		required before deletion of a row.
			// aroundNode:
			//		The DOM node of the row about to be deleted.
			var mb = dojo.marginBox(aroundNode);
			var pos = dojo._abs(aroundNode, true);

			if(!this._deleteBtns){
			// Create the delete buttons.
				this._deleteBtns = dojo.create("div",{
					"class": "buttons"
				}, this.domNode);

				this.buttons = [];

				this.buttons.push(new dojox.mobile.Button({
					btnClass: "mblRedButton",
					label: this.labelDelete
				}));
				this.buttons.push(new dojox.mobile.Button({
					btnClass: "mblBlueButton",
					label: this.labelCancel
				}));

				dojo.place(this.buttons[0].domNode, this._deleteBtns);
				dojo.place(this.buttons[1].domNode, this._deleteBtns);

				dojo.addClass(this.buttons[0].domNode, "deleteBtn");
				dojo.addClass(this.buttons[1].domNode, "cancelBtn");

				this._handleButtonClick = dojo.hitch(this._handleButtonClick);
				this.connect(this._deleteBtns, "onclick", this._handleButtonClick);
			}
			dojo.removeClass(this._deleteBtns, "fade out fast");
			dojo.style(this._deleteBtns, {
				display: "",
				width: mb.w + "px",
				height: mb.h + "px",
				top: (aroundNode.offsetTop) + "px",
				left: "0px"
			});
		},

		onDelete: function(data, index, array){
			// summary:
			//    Called when a row is deleted
			// data:
			//		The data related to the row being deleted
			// index:
			//		The index of the data in the total array
			// array:
			//		The array of data used.

			array.splice(index, 1);

			// If the data is empty, rerender in case an emptyTemplate has
			// been provided
			if(array.length < 1){
				this.render();
			}
		},

		cancelDelete: function(){
			// summary:
			//		Cancels the deletion of a row.
			this._deleting = false;
			this.handleDragCancel();
		},

		_handleButtonClick: function(event){
			// summary:
			//		Handles the click of one of the deletion buttons, either to
			//		delete the row or to cancel the deletion.
			if(event.touches && event.touches.length > 0){
				event = event.touches[0];
			}
			var node = event.target;
			if(dojo.hasClass(node, "deleteBtn")){
				this.deleteRow(this._selectedRow);
			}else if(dojo.hasClass(node, "cancelBtn")){
				this.cancelDelete();
			}else{
				return;
			}
			dojo.addClass(this._deleteBtns, "fade out");
		},

		applyClass: function(node, idx, array){
			// summary:
			//		Applies the 'first' and 'last' CSS classes to the relevant
			//		rows.

			dojo.removeClass(node, "first last");
			if(idx == 0){
				dojo.addClass(node, "first");
			}
			if(idx == array.length - 1){
				dojo.addClass(node, "last");
			}
		},

		_setDataInfo: function(rowNode, event){
			// summary:
			//    Attaches the data item and index for each row to any event
			//    that occurs on that row.
			event.item = rowNode._data;
			event.index = rowNode._idx;
		},

		onSelect: function(data, index, rowNode){
			// summary:
			//		Dummy function that is called when a row is tapped
		},

		_selectRow: function(row){
			// summary:
			//		Selects a row, applies the relevant CSS classes.
			if(this._deleting && this._selectedRow && row != this._selectedRow){
				this.cancelDelete();
			}

			if(!dojo.hasClass(row, "row")){
				return;
			}
			if(this.enableHold || this.enableDelete){
				dojo.addClass(row, "hold");
			}
			this._selectedRow = row;
		},

		_deselectRow: function(){
			// summary:
			//		Deselects a row, and cancels any drag actions that were
			//		occurring.
			if(!this._selectedRow || this._deleting){
				return;
			}
			this.handleDragCancel();
			dojo.removeClass(this._selectedRow, "hold");
			this._selectedRow = null;
		},

		_getRowNode: function(fromNode, ignoreNoClick){
			// summary:
			//		Gets the DOM node of the row that is equal to or the parent
			//		of the node passed to this function.
			while(fromNode && !fromNode._data && fromNode != this.domNode){
				if(!ignoreNoClick && dojo.hasClass(fromNode, "noclick")){
					return null;
				}
				fromNode = fromNode.parentNode;
			}
			return fromNode == this.domNode ? null : fromNode;
		},

		applyTemplate: function(template, data){
			return dojo._toDom(dojo.string.substitute(
					template, data, this._replaceToken, this.formatters || this));
		},

		render: function(){
			// summary:
			//		Renders the list.

			// Delete all existing nodes, except the deletion buttons.
			dojo.query("> *:not(.buttons)", this.domNode).forEach(dojo.destroy);

			// If there is no data, and an empty template has been provided,
			// render it.
			if(this.items.length < 1 && this.emptyTemplate){
				dojo.place(dojo._toDom(this.emptyTemplate), this.domNode, "first");
			}else{
				this.domNode.appendChild(this._renderRange(0, this.items.length));
			}
			if(dojo.hasClass(this.domNode.parentNode, "mblRoundRect")){
				dojo.addClass(this.domNode.parentNode, "mblRoundRectList")
			}

			var divs = dojo.query("> .row", this.domNode);
			if(divs.length > 0){
				dojo.addClass(divs[0], "first");
				dojo.addClass(divs[divs.length - 1], "last");
			}
		},

		_renderRange: function(startIdx, endIdx){

			var rows = [];
			var row, i;
			var frag = document.createDocumentFragment();
			startIdx = Math.max(0, startIdx);
			endIdx = Math.min(endIdx, this.items.length);

			for(i = startIdx; i < endIdx; i++){
				// Create a document fragment containing the templated row
				row = this.applyTemplate(this.itemTemplate, this.items[i]);
				dojo.addClass(row, 'row');
				row._data = this.items[i];
				row._idx = i;
				rows.push(row);
			}
			if(!this.dividerFunction || !this.dividerTemplate){
				for(i = startIdx; i < endIdx; i++){
					rows[i]._data = this.items[i];
					rows[i]._idx = i;
					frag.appendChild(rows[i]);
				}
			}else{
				var prevDividerValue = null;
				var dividerValue;
				var divider;
				for(i = startIdx; i < endIdx; i++){
					rows[i]._data = this.items[i];
					rows[i]._idx = i;

					dividerValue = this.dividerFunction(this.items[i]);
					if(dividerValue && dividerValue != prevDividerValue){
						divider = this.applyTemplate(this.dividerTemplate, {
							label: dividerValue,
							item: this.items[i]
						});
						divider._isDivider = true;
						frag.appendChild(divider);
						prevDividerValue = dividerValue;
					}
					frag.appendChild(rows[i]);
				}
			}
			return frag;
		},

		_replaceToken: function(value, key){
			if(key.charAt(0) == '!'){ value = dojo.getObject(key.substr(1), false, _this); }
			if(typeof value == "undefined"){ return ""; } // a debugging aide
			if(value == null){ return ""; }

			// Substitution keys beginning with ! will skip the transform step,
			// in case a user wishes to insert unescaped markup, e.g. ${!foo}
			return key.charAt(0) == "!" ? value :
				// Safer substitution, see heading "Attribute values" in
				// http://www.w3.org/TR/REC-html40/appendix/notes.html#h-B.3.2
				value.toString().replace(/"/g,"&quot;"); //TODO: add &amp? use encodeXML method?

		},

		_checkLoadComplete: function(){
			// summary:
			//		Checks if all templates have loaded
			this._templateLoadCount--;

			if(this._templateLoadCount < 1 && this.get("items")){
				this.render();
			}
		},

		_loadTemplate: function(url, thisAttr, callback){
			// summary:
			//		Loads a template
			if(!url){
				callback();
				return;
			}

			if(templateCache[url]){
				this.set(thisAttr, templateCache[url]);
				callback();
			}else{
				var _this = this;

				dojo.xhrGet({
					url: url,
					sync: false,
					handleAs: "text",
					load: function(text){
						templateCache[url] = dojo.trim(text);
						_this.set(thisAttr, templateCache[url]);
						callback();
					}
				});
			}
		},


		_setFormattersAttr: function(formatters){
			// summary:
			//    Sets the data items, and causes a rerender of the list
			this.formatters = formatters;
		},

		_setItemsAttr: function(items){
			// summary:
			//    Sets the data items, and causes a rerender of the list

			this.items = items || [];

			if(this._templateLoadCount < 1 && items){
				this.render();
			}
		},

		destroy: function(){
			if(this.buttons){
				dojo.forEach(this.buttons, function(button){
					button.destroy();
				});
				this.buttons = null;
			}

			this.inherited(arguments);
		}

	});

})();

}

if(!dojo._hasResource["dojo.fx.Toggler"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.fx.Toggler"] = true;
dojo.provide("dojo.fx.Toggler");


dojo.declare("dojo.fx.Toggler", null, {
	// summary:
	//		A simple `dojo.Animation` toggler API.
	//
	// description:
	//		class constructor for an animation toggler. It accepts a packed
	//		set of arguments about what type of animation to use in each
	//		direction, duration, etc. All available members are mixed into
	//		these animations from the constructor (for example, `node`,
	//		`showDuration`, `hideDuration`).
	//
	// example:
	//	|	var t = new dojo.fx.Toggler({
	//	|		node: "nodeId",
	//	|		showDuration: 500,
	//	|		// hideDuration will default to "200"
	//	|		showFunc: dojo.fx.wipeIn,
	//	|		// hideFunc will default to "fadeOut"
	//	|	});
	//	|	t.show(100); // delay showing for 100ms
	//	|	// ...time passes...
	//	|	t.hide();

	// node: DomNode
	//		the node to target for the showing and hiding animations
	node: null,

	// showFunc: Function
	//		The function that returns the `dojo.Animation` to show the node
	showFunc: dojo.fadeIn,

	// hideFunc: Function
	//		The function that returns the `dojo.Animation` to hide the node
	hideFunc: dojo.fadeOut,

	// showDuration:
	//		Time in milliseconds to run the show Animation
	showDuration: 200,

	// hideDuration:
	//		Time in milliseconds to run the hide Animation
	hideDuration: 200,

	// FIXME: need a policy for where the toggler should "be" the next
	// time show/hide are called if we're stopped somewhere in the
	// middle.
	// FIXME: also would be nice to specify individual showArgs/hideArgs mixed into
	// each animation individually.
	// FIXME: also would be nice to have events from the animations exposed/bridged

	/*=====
	_showArgs: null,
	_showAnim: null,

	_hideArgs: null,
	_hideAnim: null,

	_isShowing: false,
	_isHiding: false,
	=====*/

	constructor: function(args){
		var _t = this;

		dojo.mixin(_t, args);
		_t.node = args.node;
		_t._showArgs = dojo.mixin({}, args);
		_t._showArgs.node = _t.node;
		_t._showArgs.duration = _t.showDuration;
		_t.showAnim = _t.showFunc(_t._showArgs);

		_t._hideArgs = dojo.mixin({}, args);
		_t._hideArgs.node = _t.node;
		_t._hideArgs.duration = _t.hideDuration;
		_t.hideAnim = _t.hideFunc(_t._hideArgs);

		dojo.connect(_t.showAnim, "beforeBegin", dojo.hitch(_t.hideAnim, "stop", true));
		dojo.connect(_t.hideAnim, "beforeBegin", dojo.hitch(_t.showAnim, "stop", true));
	},

	show: function(delay){
		// summary: Toggle the node to showing
		// delay: Integer?
		//		Ammount of time to stall playing the show animation
		return this.showAnim.play(delay || 0);
	},

	hide: function(delay){
		// summary: Toggle the node to hidden
		// delay: Integer?
		//		Ammount of time to stall playing the hide animation
		return this.hideAnim.play(delay || 0);
	}
});

}

if(!dojo._hasResource["dojo.fx"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.fx"] = true;
dojo.provide("dojo.fx");



/*=====
dojo.fx = {
	// summary: Effects library on top of Base animations
};
=====*/
(function(){
	
	var d = dojo,
		_baseObj = {
			_fire: function(evt, args){
				if(this[evt]){
					this[evt].apply(this, args||[]);
				}
				return this;
			}
		};

	var _chain = function(animations){
		this._index = -1;
		this._animations = animations||[];
		this._current = this._onAnimateCtx = this._onEndCtx = null;

		this.duration = 0;
		d.forEach(this._animations, function(a){
			this.duration += a.duration;
			if(a.delay){ this.duration += a.delay; }
		}, this);
	};
	d.extend(_chain, {
		_onAnimate: function(){
			this._fire("onAnimate", arguments);
		},
		_onEnd: function(){
			d.disconnect(this._onAnimateCtx);
			d.disconnect(this._onEndCtx);
			this._onAnimateCtx = this._onEndCtx = null;
			if(this._index + 1 == this._animations.length){
				this._fire("onEnd");
			}else{
				// switch animations
				this._current = this._animations[++this._index];
				this._onAnimateCtx = d.connect(this._current, "onAnimate", this, "_onAnimate");
				this._onEndCtx = d.connect(this._current, "onEnd", this, "_onEnd");
				this._current.play(0, true);
			}
		},
		play: function(/*int?*/ delay, /*Boolean?*/ gotoStart){
			if(!this._current){ this._current = this._animations[this._index = 0]; }
			if(!gotoStart && this._current.status() == "playing"){ return this; }
			var beforeBegin = d.connect(this._current, "beforeBegin", this, function(){
					this._fire("beforeBegin");
				}),
				onBegin = d.connect(this._current, "onBegin", this, function(arg){
					this._fire("onBegin", arguments);
				}),
				onPlay = d.connect(this._current, "onPlay", this, function(arg){
					this._fire("onPlay", arguments);
					d.disconnect(beforeBegin);
					d.disconnect(onBegin);
					d.disconnect(onPlay);
				});
			if(this._onAnimateCtx){
				d.disconnect(this._onAnimateCtx);
			}
			this._onAnimateCtx = d.connect(this._current, "onAnimate", this, "_onAnimate");
			if(this._onEndCtx){
				d.disconnect(this._onEndCtx);
			}
			this._onEndCtx = d.connect(this._current, "onEnd", this, "_onEnd");
			this._current.play.apply(this._current, arguments);
			return this;
		},
		pause: function(){
			if(this._current){
				var e = d.connect(this._current, "onPause", this, function(arg){
						this._fire("onPause", arguments);
						d.disconnect(e);
					});
				this._current.pause();
			}
			return this;
		},
		gotoPercent: function(/*Decimal*/percent, /*Boolean?*/ andPlay){
			this.pause();
			var offset = this.duration * percent;
			this._current = null;
			d.some(this._animations, function(a){
				if(a.duration <= offset){
					this._current = a;
					return true;
				}
				offset -= a.duration;
				return false;
			});
			if(this._current){
				this._current.gotoPercent(offset / this._current.duration, andPlay);
			}
			return this;
		},
		stop: function(/*boolean?*/ gotoEnd){
			if(this._current){
				if(gotoEnd){
					for(; this._index + 1 < this._animations.length; ++this._index){
						this._animations[this._index].stop(true);
					}
					this._current = this._animations[this._index];
				}
				var e = d.connect(this._current, "onStop", this, function(arg){
						this._fire("onStop", arguments);
						d.disconnect(e);
					});
				this._current.stop();
			}
			return this;
		},
		status: function(){
			return this._current ? this._current.status() : "stopped";
		},
		destroy: function(){
			if(this._onAnimateCtx){ d.disconnect(this._onAnimateCtx); }
			if(this._onEndCtx){ d.disconnect(this._onEndCtx); }
		}
	});
	d.extend(_chain, _baseObj);

	dojo.fx.chain = function(/*dojo.Animation[]*/ animations){
		// summary:
		//		Chain a list of `dojo.Animation`s to run in sequence
		//
		// description:
		//		Return a `dojo.Animation` which will play all passed
		//		`dojo.Animation` instances in sequence, firing its own
		//		synthesized events simulating a single animation. (eg:
		//		onEnd of this animation means the end of the chain,
		//		not the individual animations within)
		//
		// example:
		//	Once `node` is faded out, fade in `otherNode`
		//	|	dojo.fx.chain([
		//	|		dojo.fadeIn({ node:node }),
		//	|		dojo.fadeOut({ node:otherNode })
		//	|	]).play();
		//
		return new _chain(animations) // dojo.Animation
	};

	var _combine = function(animations){
		this._animations = animations||[];
		this._connects = [];
		this._finished = 0;

		this.duration = 0;
		d.forEach(animations, function(a){
			var duration = a.duration;
			if(a.delay){ duration += a.delay; }
			if(this.duration < duration){ this.duration = duration; }
			this._connects.push(d.connect(a, "onEnd", this, "_onEnd"));
		}, this);
		
		this._pseudoAnimation = new d.Animation({curve: [0, 1], duration: this.duration});
		var self = this;
		d.forEach(["beforeBegin", "onBegin", "onPlay", "onAnimate", "onPause", "onStop", "onEnd"],
			function(evt){
				self._connects.push(d.connect(self._pseudoAnimation, evt,
					function(){ self._fire(evt, arguments); }
				));
			}
		);
	};
	d.extend(_combine, {
		_doAction: function(action, args){
			d.forEach(this._animations, function(a){
				a[action].apply(a, args);
			});
			return this;
		},
		_onEnd: function(){
			if(++this._finished > this._animations.length){
				this._fire("onEnd");
			}
		},
		_call: function(action, args){
			var t = this._pseudoAnimation;
			t[action].apply(t, args);
		},
		play: function(/*int?*/ delay, /*Boolean?*/ gotoStart){
			this._finished = 0;
			this._doAction("play", arguments);
			this._call("play", arguments);
			return this;
		},
		pause: function(){
			this._doAction("pause", arguments);
			this._call("pause", arguments);
			return this;
		},
		gotoPercent: function(/*Decimal*/percent, /*Boolean?*/ andPlay){
			var ms = this.duration * percent;
			d.forEach(this._animations, function(a){
				a.gotoPercent(a.duration < ms ? 1 : (ms / a.duration), andPlay);
			});
			this._call("gotoPercent", arguments);
			return this;
		},
		stop: function(/*boolean?*/ gotoEnd){
			this._doAction("stop", arguments);
			this._call("stop", arguments);
			return this;
		},
		status: function(){
			return this._pseudoAnimation.status();
		},
		destroy: function(){
			d.forEach(this._connects, dojo.disconnect);
		}
	});
	d.extend(_combine, _baseObj);

	dojo.fx.combine = function(/*dojo.Animation[]*/ animations){
		// summary:
		//		Combine a list of `dojo.Animation`s to run in parallel
		//
		// description:
		//		Combine an array of `dojo.Animation`s to run in parallel,
		//		providing a new `dojo.Animation` instance encompasing each
		//		animation, firing standard animation events.
		//
		// example:
		//	Fade out `node` while fading in `otherNode` simultaneously
		//	|	dojo.fx.combine([
		//	|		dojo.fadeIn({ node:node }),
		//	|		dojo.fadeOut({ node:otherNode })
		//	|	]).play();
		//
		// example:
		//	When the longest animation ends, execute a function:
		//	|	var anim = dojo.fx.combine([
		//	|		dojo.fadeIn({ node: n, duration:700 }),
		//	|		dojo.fadeOut({ node: otherNode, duration: 300 })
		//	|	]);
		//	|	dojo.connect(anim, "onEnd", function(){
		//	|		// overall animation is done.
		//	|	});
		//	|	anim.play(); // play the animation
		//
		return new _combine(animations); // dojo.Animation
	};

	dojo.fx.wipeIn = function(/*Object*/ args){
		// summary:
		//		Expand a node to it's natural height.
		//
		// description:
		//		Returns an animation that will expand the
		//		node defined in 'args' object from it's current height to
		//		it's natural height (with no scrollbar).
		//		Node must have no margin/border/padding.
		//
		// args: Object
		//		A hash-map of standard `dojo.Animation` constructor properties
		//		(such as easing: node: duration: and so on)
		//
		// example:
		//	|	dojo.fx.wipeIn({
		//	|		node:"someId"
		//	|	}).play()
		var node = args.node = d.byId(args.node), s = node.style, o;

		var anim = d.animateProperty(d.mixin({
			properties: {
				height: {
					// wrapped in functions so we wait till the last second to query (in case value has changed)
					start: function(){
						// start at current [computed] height, but use 1px rather than 0
						// because 0 causes IE to display the whole panel
						o = s.overflow;
						s.overflow = "hidden";
						if(s.visibility == "hidden" || s.display == "none"){
							s.height = "1px";
							s.display = "";
							s.visibility = "";
							return 1;
						}else{
							var height = d.style(node, "height");
							return Math.max(height, 1);
						}
					},
					end: function(){
						return node.scrollHeight;
					}
				}
			}
		}, args));

		d.connect(anim, "onEnd", function(){
			s.height = "auto";
			s.overflow = o;
		});

		return anim; // dojo.Animation
	};

	dojo.fx.wipeOut = function(/*Object*/ args){
		// summary:
		//		Shrink a node to nothing and hide it.
		//
		// description:
		//		Returns an animation that will shrink node defined in "args"
		//		from it's current height to 1px, and then hide it.
		//
		// args: Object
		//		A hash-map of standard `dojo.Animation` constructor properties
		//		(such as easing: node: duration: and so on)
		//
		// example:
		//	|	dojo.fx.wipeOut({ node:"someId" }).play()
		
		var node = args.node = d.byId(args.node), s = node.style, o;
		
		var anim = d.animateProperty(d.mixin({
			properties: {
				height: {
					end: 1 // 0 causes IE to display the whole panel
				}
			}
		}, args));

		d.connect(anim, "beforeBegin", function(){
			o = s.overflow;
			s.overflow = "hidden";
			s.display = "";
		});
		d.connect(anim, "onEnd", function(){
			s.overflow = o;
			s.height = "auto";
			s.display = "none";
		});

		return anim; // dojo.Animation
	};

	dojo.fx.slideTo = function(/*Object*/ args){
		// summary:
		//		Slide a node to a new top/left position
		//
		// description:
		//		Returns an animation that will slide "node"
		//		defined in args Object from its current position to
		//		the position defined by (args.left, args.top).
		//
		// args: Object
		//		A hash-map of standard `dojo.Animation` constructor properties
		//		(such as easing: node: duration: and so on). Special args members
		//		are `top` and `left`, which indicate the new position to slide to.
		//
		// example:
		//	|	dojo.fx.slideTo({ node: node, left:"40", top:"50", units:"px" }).play()

		var node = args.node = d.byId(args.node),
			top = null, left = null;

		var init = (function(n){
			return function(){
				var cs = d.getComputedStyle(n);
				var pos = cs.position;
				top = (pos == 'absolute' ? n.offsetTop : parseInt(cs.top) || 0);
				left = (pos == 'absolute' ? n.offsetLeft : parseInt(cs.left) || 0);
				if(pos != 'absolute' && pos != 'relative'){
					var ret = d.position(n, true);
					top = ret.y;
					left = ret.x;
					n.style.position="absolute";
					n.style.top=top+"px";
					n.style.left=left+"px";
				}
			};
		})(node);
		init();

		var anim = d.animateProperty(d.mixin({
			properties: {
				top: args.top || 0,
				left: args.left || 0
			}
		}, args));
		d.connect(anim, "beforeBegin", anim, init);

		return anim; // dojo.Animation
	};

})();

}

if(!dojo._hasResource["dojox.mobile.app.ListSelector"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app.ListSelector"] = true;
dojo.provide("dojox.mobile.app.ListSelector");
dojo.experimental("dojox.mobile.app.ListSelector");




dojo.declare("dojox.mobile.app.ListSelector", dojox.mobile.app._Widget, {

	// data: Array
	//    The array of items to display.  Each element in the array
	//    should have both a label and value attribute, e.g.
	//    [{label: "Open", value: 1} , {label: "Delete", value: 2}]
	data: null,

	// controller: Object
	//    The current SceneController widget.
	controller: null,

	// onChoose: Function
	//    The callback function for when an item is selected
	onChoose: null,

	destroyOnHide: false,

	_setDataAttr: function(data){
		this.data = data;
	
		if(this.data){
			this.render();
		}
	},

	postCreate: function(){
		dojo.addClass(this.domNode, "listSelector");
	
		var _this = this;
	
		this.connect(this.domNode, "onclick", function(event){
			if(!dojo.hasClass(event.target, "listSelectorRow")){
				return;
			}
	
			if(_this.onChoose){
				_this.onChoose(_this.data[event.target._idx].value);
			}
			_this.hide();
		});

		this.connect(this.domNode, "onmousedown", function(event){
			if(!dojo.hasClass(event.target, "listSelectorRow")){
				return;
			}
			dojo.addClass(event.target, "listSelectorRow-selected");
		});

		this.connect(this.domNode, "onmouseup", function(event){
			if(!dojo.hasClass(event.target, "listSelectorRow")){
				return;
			}
			dojo.removeClass(event.target, "listSelectorRow-selected");
		});

		this.connect(this.domNode, "onmouseout", function(event){
			if(!dojo.hasClass(event.target, "listSelectorRow")){
				return;
			}
			dojo.removeClass(event.target, "listSelectorRow-selected");
		});
	
		var viewportSize = this.controller.getWindowSize();
	
		this.mask = dojo.create("div", {"class": "dialogUnderlayWrapper",
			innerHTML: "<div class=\"dialogUnderlay\"></div>"
		}, this.controller.assistant.domNode);
	
		this.connect(this.mask, "onclick", function(){
			_this.onChoose && _this.onChoose();
			_this.hide();
		});
	},

	show: function(fromNode){

		// Using dojo.fx here. Must figure out how to do this with CSS animations!!
		var startPos;
	
		var windowSize = this.controller.getWindowSize();
		var fromNodePos;
		if(fromNode){
			fromNodePos = dojo._abs(fromNode);
			startPos = fromNodePos;
		}else{
			startPos.x = windowSize.w / 2;
			startPos.y = 200;
		}
		console.log("startPos = ", startPos);
	
		dojo.style(this.domNode, {
			opacity: 0,
			display: "",
			width: Math.floor(windowSize.w * 0.8) + "px"
		});
	
		var maxWidth = 0;
		dojo.query(">", this.domNode).forEach(function(node){
			dojo.style(node, {
				"float": "left"
			});
			maxWidth = Math.max(maxWidth, dojo.marginBox(node).w);
			dojo.style(node, {
				"float": "none"
			});
		});
		maxWidth = Math.min(maxWidth, Math.round(windowSize.w * 0.8))
					+ dojo.style(this.domNode, "paddingLeft")
					+ dojo.style(this.domNode, "paddingRight")
					+ 1;
	
		dojo.style(this.domNode, "width", maxWidth + "px");
		var targetHeight = dojo.marginBox(this.domNode).h;
	
		var _this = this;
	
	
		var targetY = fromNodePos ?
				Math.max(30, fromNodePos.y - targetHeight - 10) :
				this.getScroll().y + 30;
	
		console.log("fromNodePos = ", fromNodePos, " targetHeight = ", targetHeight,
				" targetY = " + targetY, " startPos ", startPos);
	
	
		var anim1 = dojo.animateProperty({
			node: this.domNode,
			duration: 400,
			properties: {
				width: {start: 1, end: maxWidth},
				height: {start: 1, end: targetHeight},
				top: {start: startPos.y, end: targetY},
				left: {start: startPos.x, end: (windowSize.w/2 - maxWidth/2)},
				opacity: {start: 0, end: 1},
				fontSize: {start: 1}
			},
			onEnd: function(){
				dojo.style(_this.domNode, "width", "inherit");
			}
		});
		var anim2 = dojo.fadeIn({
			node: this.mask,
			duration: 400
		});
		dojo.fx.combine([anim1, anim2]).play();

	},

	hide: function(){
		// Using dojo.fx here. Must figure out how to do this with CSS animations!!
	
		var _this = this;
	
		var anim1 = dojo.animateProperty({
			node: this.domNode,
			duration: 500,
			properties: {
				width: {end: 1},
				height: {end: 1},
				opacity: {end: 0},
				fontSize: {end: 1}
			},
			onEnd: function(){
				if(_this.get("destroyOnHide")){
					_this.destroy();
				}
			}
		});
	
		var anim2 = dojo.fadeOut({
			node: this.mask,
			duration: 400
		});
		dojo.fx.combine([anim1, anim2]).play();
	},

	render: function(){
		// summary:
		//    Renders
	
		dojo.empty(this.domNode);
		dojo.style(this.domNode, "opacity", 0);
	
		var row;
	
		for(var i = 0; i < this.data.length; i++){
			// Create each row and add any custom classes. Also set the _idx property.
			row = dojo.create("div", {
				"class": "listSelectorRow " + (this.data[i].className || ""),
				innerHTML: this.data[i].label
			}, this.domNode);
	
			row._idx = i;
	
			if(i == 0){
				dojo.addClass(row, "first");
			}
			if(i == this.data.length - 1){
				dojo.addClass(row, "last");
			}
	
		}
	},


	destroy: function(){
		this.inherited(arguments);
		dojo.destroy(this.mask);
	}

});

}

if(!dojo._hasResource["dojox.mobile.app._FormWidget"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app._FormWidget"] = true;
dojo.provide("dojox.mobile.app._FormWidget");
dojo.experimental("dojox.mobile.app._FormWidget");





dojo.declare("dojox.mobile.app._FormWidget", dijit._WidgetBase, {
	// summary:
	//		Base class for widgets corresponding to native HTML elements such as <checkbox> or <button>,
	//		which can be children of a <form> node or a `dojox.mobile.app.Form` widget.
	//
	// description:
	//		Represents a single HTML element.
	//		All these widgets should have these attributes just like native HTML input elements.
	//		You can set them during widget construction or afterwards, via `dijit._WidgetBase.attr`.
	//
	//		They also share some common methods.

	// name: String
	//		Name used when submitting form; same as "name" attribute or plain HTML elements
	name: "",

	// alt: String
	//		Corresponds to the native HTML <input> element's attribute.
	alt: "",

	// value: String
	//		Corresponds to the native HTML <input> element's attribute.
	value: "",

	// type: String
	//		Corresponds to the native HTML <input> element's attribute.
	type: "text",

	// disabled: Boolean
	//		Should this widget respond to user input?
	//		In markup, this is specified as "disabled='disabled'", or just "disabled".
	disabled: false,

	// intermediateChanges: Boolean
	//		Fires onChange for each value change or only on demand
	intermediateChanges: false,

	// scrollOnFocus: Boolean
	//		On focus, should this widget scroll into view?
	scrollOnFocus: false,

	// These mixins assume that the focus node is an INPUT, as many but not all _FormWidgets are.
	attributeMap: dojo.delegate(dijit._WidgetBase.prototype.attributeMap, {
		value: "focusNode",
		id: "focusNode",
		alt: "focusNode",
		title: "focusNode"
	}),

	postMixInProperties: function(){
		// Setup name=foo string to be referenced from the template (but only if a name has been specified)
		// Unfortunately we can't use attributeMap to set the name due to IE limitations, see #8660
		// Regarding escaping, see heading "Attribute values" in
		// http://www.w3.org/TR/REC-html40/appendix/notes.html#h-B.3.2
		this.nameAttrSetting = this.name ? ('name="' + this.name.replace(/'/g, "&quot;") + '"') : '';
		this.inherited(arguments);
	},

	postCreate: function(){
		this.inherited(arguments);
		this.connect(this.domNode, "onmousedown", "_onMouseDown");
	},

	_setDisabledAttr: function(/*Boolean*/ value){
		this.disabled = value;
		dojo.attr(this.focusNode, 'disabled', value);
		if(this.valueNode){
			dojo.attr(this.valueNode, 'disabled', value);
		}
	},

	_onFocus: function(e){
		if(this.scrollOnFocus){
			dojo.window.scrollIntoView(this.domNode);
		}
		this.inherited(arguments);
	},

	isFocusable: function(){
		// summary:
		//		Tells if this widget is focusable or not.   Used internally by dijit.
		// tags:
		//		protected
		return !this.disabled && !this.readOnly
			&& this.focusNode && (dojo.style(this.domNode, "display") != "none");
	},

	focus: function(){
		// summary:
		//		Put focus on this widget
		this.focusNode.focus();
	},

	compare: function(/*anything*/val1, /*anything*/val2){
		// summary:
		//		Compare 2 values (as returned by attr('value') for this widget).
		// tags:
		//		protected
		if(typeof val1 == "number" && typeof val2 == "number"){
			return (isNaN(val1) && isNaN(val2)) ? 0 : val1 - val2;
		}else if(val1 > val2){
			return 1;
		}else if(val1 < val2){
			return -1;
		}else{
			return 0;
		}
	},

	onChange: function(newValue){
		// summary:
		//		Callback when this widget's value is changed.
		// tags:
		//		callback
	},

	// _onChangeActive: [private] Boolean
	//		Indicates that changes to the value should call onChange() callback.
	//		This is false during widget initialization, to avoid calling onChange()
	//		when the initial value is set.
	_onChangeActive: false,

	_handleOnChange: function(/*anything*/ newValue, /* Boolean? */ priorityChange){
		// summary:
		//		Called when the value of the widget is set.  Calls onChange() if appropriate
		// newValue:
		//		the new value
		// priorityChange:
		//		For a slider, for example, dragging the slider is priorityChange==false,
		//		but on mouse up, it's priorityChange==true.  If intermediateChanges==true,
		//		onChange is only called form priorityChange=true events.
		// tags:
		//		private
		this._lastValue = newValue;
		if(this._lastValueReported == undefined && (priorityChange === null || !this._onChangeActive)){
			// this block executes not for a change, but during initialization,
			// and is used to store away the original value (or for ToggleButton, the original checked state)
			this._resetValue = this._lastValueReported = newValue;
		}
		if((this.intermediateChanges || priorityChange || priorityChange === undefined) &&
			((typeof newValue != typeof this._lastValueReported) ||
				this.compare(newValue, this._lastValueReported) != 0)){
			this._lastValueReported = newValue;
			if(this._onChangeActive){
				if(this._onChangeHandle){
					clearTimeout(this._onChangeHandle);
				}
				// setTimout allows hidden value processing to run and
				// also the onChange handler can safely adjust focus, etc
				this._onChangeHandle = setTimeout(dojo.hitch(this,
					function(){
						this._onChangeHandle = null;
						this.onChange(newValue);
					}), 0); // try to collapse multiple onChange's fired faster than can be processed
			}
		}
	},

	create: function(){
		// Overrides _Widget.create()
		this.inherited(arguments);
		this._onChangeActive = true;
	},

	destroy: function(){
		if(this._onChangeHandle){ // destroy called before last onChange has fired
			clearTimeout(this._onChangeHandle);
			this.onChange(this._lastValueReported);
		}
		this.inherited(arguments);
	},

	_onMouseDown: function(e){
		// If user clicks on the button, even if the mouse is released outside of it,
		// this button should get focus (to mimics native browser buttons).
		// This is also needed on chrome because otherwise buttons won't get focus at all,
		// which leads to bizarre focus restore on Dialog close etc.
		if(this.isFocusable()){
			// Set a global event to handle mouseup, so it fires properly
			// even if the cursor leaves this.domNode before the mouse up event.
			var mouseUpConnector = this.connect(dojo.body(), "onmouseup", function(){
				if(this.isFocusable()){
					this.focus();
				}
				this.disconnect(mouseUpConnector);
			});
		}
	},

	selectInputText: function(/*DomNode*/element, /*Number?*/ start, /*Number?*/ stop){
		// summary:
		//		Select text in the input element argument, from start (default 0), to stop (default end).

		// TODO: use functions in _editor/selection.js?
		var _window = dojo.global;
		var _document = dojo.doc;
		element = dojo.byId(element);
		if(isNaN(start)){ start = 0; }
		if(isNaN(stop)){ stop = element.value ? element.value.length : 0; }
		dijit.focus(element);

		if(_window["getSelection"] && element.setSelectionRange){
			element.setSelectionRange(start, stop);
		}
	}
});

dojo.declare("dojox.mobile.app._FormValueWidget", dojox.mobile.app._FormWidget,
{
	// summary:
	//		Base class for widgets corresponding to native HTML elements such as <input> or <select> that have user changeable values.
	// description:
	//		Each _FormValueWidget represents a single input value, and has a (possibly hidden) <input> element,
	//		to which it serializes it's input value, so that form submission (either normal submission or via FormBind?)
	//		works as expected.

	// Don't attempt to mixin the 'type', 'name' attributes here programatically -- they must be declared
	// directly in the template as read by the parser in order to function. IE is known to specifically
	// require the 'name' attribute at element creation time.   See #8484, #8660.
	// TODO: unclear what that {value: ""} is for; FormWidget.attributeMap copies value to focusNode,
	// so maybe {value: ""} is so the value *doesn't* get copied to focusNode?
	// Seems like we really want value removed from attributeMap altogether
	// (although there's no easy way to do that now)

	// readOnly: Boolean
	//		Should this widget respond to user input?
	//		In markup, this is specified as "readOnly".
	//		Similar to disabled except readOnly form values are submitted.
	readOnly: false,

	attributeMap: dojo.delegate(dojox.mobile.app._FormWidget.prototype.attributeMap, {
		value: "",
		readOnly: "focusNode"
	}),

	_setReadOnlyAttr: function(/*Boolean*/ value){
		this.readOnly = value;
		dojo.attr(this.focusNode, 'readOnly', value);
	},

	postCreate: function(){
		this.inherited(arguments);

		// Update our reset value if it hasn't yet been set (because this.set()
		// is only called when there *is* a value)
		if(this._resetValue === undefined){
			this._resetValue = this.value;
		}
	},

	_setValueAttr: function(/*anything*/ newValue, /*Boolean, optional*/ priorityChange){
		// summary:
		//		Hook so attr('value', value) works.
		// description:
		//		Sets the value of the widget.
		//		If the value has changed, then fire onChange event, unless priorityChange
		//		is specified as null (or false?)
		this.value = newValue;
		this._handleOnChange(newValue, priorityChange);
	},

	_getValueAttr: function(){
		// summary:
		//		Hook so attr('value') works.
		return this._lastValue;
	},

	undo: function(){
		// summary:
		//		Restore the value to the last value passed to onChange
		this._setValueAttr(this._lastValueReported, false);
	},

	reset: function(){
		// summary:
		//		Reset the widget's value to what it was at initialization time
		this._hasBeenBlurred = false;
		this._setValueAttr(this._resetValue, true);
	}
});

}

if(!dojo._hasResource["dojox.mobile.app.TextBox"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app.TextBox"] = true;
dojo.provide("dojox.mobile.app.TextBox");
dojo.experimental("dojox.mobile.app.TextBox");




dojo.declare(
	"dojox.mobile.app.TextBox",
	dojox.mobile.app._FormValueWidget, {

		// summary:
		//		A base class for textbox form inputs

		// trim: Boolean
		//		Removes leading and trailing whitespace if true.  Default is false.
		trim: false,

		// uppercase: Boolean
		//		Converts all characters to uppercase if true.  Default is false.
		uppercase: false,

		// lowercase: Boolean
		//		Converts all characters to lowercase if true.  Default is false.
		lowercase: false,

		// propercase: Boolean
		//		Converts the first character of each word to uppercase if true.
		propercase: false,

		//	maxLength: String
		//		HTML INPUT tag maxLength declaration.
		maxLength: "",

		//	selectOnClick: [const] Boolean
		//		If true, all text will be selected when focused with mouse
		selectOnClick: false,

		//	placeHolder: String
		//		Defines a hint to help users fill out the input field (as defined in HTML 5).
		//		This should only contain plain text (no html markup).
		placeHolder: "",

		baseClass: "mblTextBox",

		attributeMap: dojo.delegate(dojox.mobile.app._FormValueWidget.prototype.attributeMap, {
			maxLength: "focusNode"
		}),

		buildRendering: function(){
			var node = this.srcNodeRef;

			// If an input is used as the source node, wrap it in a div
			if(!node || node.tagName != "INPUT"){
				node = dojo.create("input", {});
			}

			dojo.attr(node, {
				type: "text",
				value: dojo.attr(node, "value") || "",
				placeholder: this.placeHolder || null
			});

			this.domNode = this.textbox = this.focusNode = node;
		},

		_setPlaceHolderAttr: function(v){
			this.placeHolder = v;
			if(this.textbox){
				dojo.attr(this.textbox, "placeholder", v);
			}
		},


		_getValueAttr: function(){
			// summary:
			//		Hook so attr('value') works as we like.
			// description:
			//		For `dijit.form.TextBox` this basically returns the value of the <input>.
			//
			//		For `dijit.form.MappedTextBox` subclasses, which have both
			//		a "displayed value" and a separate "submit value",
			//		This treats the "displayed value" as the master value, computing the
			//		submit value from it via this.parse().
			return this.parse(this.get('displayedValue'), this.constraints);
		},

		_setValueAttr: function(value, /*Boolean?*/ priorityChange, /*String?*/ formattedValue){
			// summary:
			//		Hook so attr('value', ...) works.
			//
			// description:
			//		Sets the value of the widget to "value" which can be of
			//		any type as determined by the widget.
			//
			// value:
			//		The visual element value is also set to a corresponding,
			//		but not necessarily the same, value.
			//
			// formattedValue:
			//		If specified, used to set the visual element value,
			//		otherwise a computed visual value is used.
			//
			// priorityChange:
			//		If true, an onChange event is fired immediately instead of
			//		waiting for the next blur event.

			var filteredValue;
			if(value !== undefined){
				// TODO: this is calling filter() on both the display value and the actual value.
				// I added a comment to the filter() definition about this, but it should be changed.
				filteredValue = this.filter(value);
				if(typeof formattedValue != "string"){
					if(filteredValue !== null
							&& ((typeof filteredValue != "number") || !isNaN(filteredValue))){
						formattedValue = this.filter(this.format(filteredValue, this.constraints));
					}else{ formattedValue = ''; }
				}
			}
			if(formattedValue != null && formattedValue != undefined
					&& ((typeof formattedValue) != "number" || !isNaN(formattedValue))
					&& this.textbox.value != formattedValue){
				this.textbox.value = formattedValue;
			}

			this.inherited(arguments, [filteredValue, priorityChange]);
		},

		// displayedValue: String
		//		For subclasses like ComboBox where the displayed value
		//		(ex: Kentucky) and the serialized value (ex: KY) are different,
		//		this represents the displayed value.
		//
		//		Setting 'displayedValue' through attr('displayedValue', ...)
		//		updates 'value', and vice-versa.  Otherwise 'value' is updated
		//		from 'displayedValue' periodically, like onBlur etc.
		//
		//		TODO: move declaration to MappedTextBox?
		//		Problem is that ComboBox references displayedValue,
		//		for benefit of FilteringSelect.
		displayedValue: "",

		_getDisplayedValueAttr: function(){
			// summary:
			//		Hook so attr('displayedValue') works.
			// description:
			//		Returns the displayed value (what the user sees on the screen),
			// 		after filtering (ie, trimming spaces etc.).
			//
			//		For some subclasses of TextBox (like ComboBox), the displayed value
			//		is different from the serialized value that's actually
			//		sent to the server (see dijit.form.ValidationTextBox.serialize)

			return this.filter(this.textbox.value);
		},

		_setDisplayedValueAttr: function(/*String*/value){
			// summary:
			//		Hook so attr('displayedValue', ...) works.
			// description:
			//		Sets the value of the visual element to the string "value".
			//		The widget value is also set to a corresponding,
			//		but not necessarily the same, value.

			if(value === null || value === undefined){ value = '' }
			else if(typeof value != "string"){ value = String(value) }
			this.textbox.value = value;
			this._setValueAttr(this.get('value'), undefined, value);
		},

		format: function(/* String */ value, /* Object */ constraints){
			// summary:
			//		Replacable function to convert a value to a properly formatted string.
			// tags:
			//		protected extension
			return ((value == null || value == undefined) ? "" : (value.toString ? value.toString() : value));
		},

		parse: function(/* String */ value, /* Object */ constraints){
			// summary:
			//		Replacable function to convert a formatted string to a value
			// tags:
			//		protected extension

			return value;	// String
		},

		_refreshState: function(){
			// summary:
			//		After the user types some characters, etc., this method is
			//		called to check the field for validity etc.  The base method
			//		in `dijit.form.TextBox` does nothing, but subclasses override.
			// tags:
			//		protected
		},

		_onInput: function(e){
			if(e && e.type && /key/i.test(e.type) && e.keyCode){
				switch(e.keyCode){
					case dojo.keys.SHIFT:
					case dojo.keys.ALT:
					case dojo.keys.CTRL:
					case dojo.keys.TAB:
						return;
				}
			}
			if(this.intermediateChanges){
				var _this = this;
				// the setTimeout allows the key to post to the widget input box
				setTimeout(function(){ _this._handleOnChange(_this.get('value'), false); }, 0);
			}
			this._refreshState();
		},

		postCreate: function(){
			// setting the value here is needed since value="" in the template causes "undefined"
			// and setting in the DOM (instead of the JS object) helps with form reset actions

			this.textbox.setAttribute("value", this.textbox.value); // DOM and JS values shuld be the same
			this.inherited(arguments);
			if(dojo.isMoz || dojo.isOpera){
				this.connect(this.textbox, "oninput", this._onInput);
			}else{
				this.connect(this.textbox, "onkeydown", this._onInput);
				this.connect(this.textbox, "onkeyup", this._onInput);
				this.connect(this.textbox, "onpaste", this._onInput);
				this.connect(this.textbox, "oncut", this._onInput);
			}
		},

		_blankValue: '', // if the textbox is blank, what value should be reported
		filter: function(val){
			// summary:
			//		Auto-corrections (such as trimming) that are applied to textbox
			//		value on blur or form submit.
			// description:
			//		For MappedTextBox subclasses, this is called twice
			// 			- once with the display value
			//			- once the value as set/returned by attr('value', ...)
			//		and attr('value'), ex: a Number for NumberTextBox.
			//
			//		In the latter case it does corrections like converting null to NaN.  In
			//		the former case the NumberTextBox.filter() method calls this.inherited()
			//		to execute standard trimming code in TextBox.filter().
			//
			//		TODO: break this into two methods in 2.0
			//
			// tags:
			//		protected extension
			if(val === null){ return this._blankValue; }
			if(typeof val != "string"){ return val; }
			if(this.trim){
				val = dojo.trim(val);
			}
			if(this.uppercase){
				val = val.toUpperCase();
			}
			if(this.lowercase){
				val = val.toLowerCase();
			}
			if(this.propercase){
				val = val.replace(/[^\s]+/g, function(word){
					return word.substring(0,1).toUpperCase() + word.substring(1);
				});
			}
			return val;
		},

		_setBlurValue: function(){
			this._setValueAttr(this.get('value'), true);
		},

		_onBlur: function(e){
			if(this.disabled){ return; }
			this._setBlurValue();
			this.inherited(arguments);

			if(this._selectOnClickHandle){
				this.disconnect(this._selectOnClickHandle);
			}
			if(this.selectOnClick && dojo.isMoz){
				this.textbox.selectionStart = this.textbox.selectionEnd = undefined; // clear selection so that the next mouse click doesn't reselect
			}

		},

		_onFocus: function(/*String*/ by){
			if(this.disabled || this.readOnly){ return; }

			// Select all text on focus via click if nothing already selected.
			// Since mouse-up will clear the selection need to defer selection until after mouse-up.
			// Don't do anything on focus by tabbing into the widget since there's no associated mouse-up event.
			if(this.selectOnClick && by == "mouse"){
				this._selectOnClickHandle = this.connect(this.domNode, "onmouseup", function(){
					// Only select all text on first click; otherwise users would have no way to clear
					// the selection.
					this.disconnect(this._selectOnClickHandle);

					// Check if the user selected some text manually (mouse-down, mouse-move, mouse-up)
					// and if not, then select all the text
					var textIsNotSelected;
					textIsNotSelected = this.textbox.selectionStart == this.textbox.selectionEnd;
					if(textIsNotSelected){
						this.selectInputText(this.textbox);
					}
				});
			}

			this._refreshState();
			this.inherited(arguments);
		},

		reset: function(){
			// Overrides dijit._FormWidget.reset().
			// Additionally resets the displayed textbox value to ''
			this.textbox.value = '';
			this.inherited(arguments);
		}
	}
);

}

if(!dojo._hasResource["dojo.fx.easing"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.fx.easing"] = true;
dojo.provide("dojo.fx.easing");

dojo.getObject("fx.easing", true, dojo);

dojo.fx.easing = {
	// summary:
	//		Collection of easing functions to use beyond the default
	//		`dojo._defaultEasing` function.
	//
	// description:
	//
	//		Easing functions are used to manipulate the iteration through
	//		an `dojo.Animation`s _Line. _Line being the properties of an Animation,
	//		and the easing function progresses through that Line determing
	//		how quickly (or slowly) it should go. Or more accurately: modify
	//		the value of the _Line based on the percentage of animation completed.
	//
	//		All functions follow a simple naming convention of "ease type" + "when".
	//		If the name of the function ends in Out, the easing described appears
	//		towards the end of the animation. "In" means during the beginning,
	//		and InOut means both ranges of the Animation will applied, both
	//		beginning and end.
	//
	//		One does not call the easing function directly, it must be passed to
	//		the `easing` property of an animation.
	//
	//	example:
	//	|	
	//	|	var anim = dojo.fadeOut({
	//	|		node: 'node',
	//	|		duration: 2000,
	//	|		//	note there is no ()
	//	|		easing: dojo.fx.easing.quadIn
	//	|	}).play();
	//
	
	linear: function(/* Decimal? */n){
		// summary: A linear easing function
		return n;
	},

	quadIn: function(/* Decimal? */n){
		return Math.pow(n, 2);
	},

	quadOut: function(/* Decimal? */n){
		return n * (n - 2) * -1;
	},

	quadInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return Math.pow(n, 2) / 2; }
		return -1 * ((--n) * (n - 2) - 1) / 2;
	},

	cubicIn: function(/* Decimal? */n){
		return Math.pow(n, 3);
	},

	cubicOut: function(/* Decimal? */n){
		return Math.pow(n - 1, 3) + 1;
	},

	cubicInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return Math.pow(n, 3) / 2; }
		n -= 2;
		return (Math.pow(n, 3) + 2) / 2;
	},

	quartIn: function(/* Decimal? */n){
		return Math.pow(n, 4);
	},

	quartOut: function(/* Decimal? */n){
		return -1 * (Math.pow(n - 1, 4) - 1);
	},

	quartInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return Math.pow(n, 4) / 2; }
		n -= 2;
		return -1 / 2 * (Math.pow(n, 4) - 2);
	},

	quintIn: function(/* Decimal? */n){
		return Math.pow(n, 5);
	},

	quintOut: function(/* Decimal? */n){
		return Math.pow(n - 1, 5) + 1;
	},

	quintInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return Math.pow(n, 5) / 2; };
		n -= 2;
		return (Math.pow(n, 5) + 2) / 2;
	},

	sineIn: function(/* Decimal? */n){
		return -1 * Math.cos(n * (Math.PI / 2)) + 1;
	},

	sineOut: function(/* Decimal? */n){
		return Math.sin(n * (Math.PI / 2));
	},

	sineInOut: function(/* Decimal? */n){
		return -1 * (Math.cos(Math.PI * n) - 1) / 2;
	},

	expoIn: function(/* Decimal? */n){
		return (n == 0) ? 0 : Math.pow(2, 10 * (n - 1));
	},

	expoOut: function(/* Decimal? */n){
		return (n == 1) ? 1 : (-1 * Math.pow(2, -10 * n) + 1);
	},

	expoInOut: function(/* Decimal? */n){
		if(n == 0){ return 0; }
		if(n == 1){ return 1; }
		n = n * 2;
		if(n < 1){ return Math.pow(2, 10 * (n - 1)) / 2; }
		--n;
		return (-1 * Math.pow(2, -10 * n) + 2) / 2;
	},

	circIn: function(/* Decimal? */n){
		return -1 * (Math.sqrt(1 - Math.pow(n, 2)) - 1);
	},

	circOut: function(/* Decimal? */n){
		n = n - 1;
		return Math.sqrt(1 - Math.pow(n, 2));
	},

	circInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return -1 / 2 * (Math.sqrt(1 - Math.pow(n, 2)) - 1); }
		n -= 2;
		return 1 / 2 * (Math.sqrt(1 - Math.pow(n, 2)) + 1);
	},

	backIn: function(/* Decimal? */n){
		// summary:
		//		An easing function that starts away from the target,
		//		and quickly accelerates towards the end value.
		//
		//		Use caution when the easing will cause values to become
		//		negative as some properties cannot be set to negative values.
		var s = 1.70158;
		return Math.pow(n, 2) * ((s + 1) * n - s);
	},

	backOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that pops past the range briefly, and slowly comes back.
		//
		// description:
		//		An easing function that pops past the range briefly, and slowly comes back.
		//
		//		Use caution when the easing will cause values to become negative as some
		//		properties cannot be set to negative values.
		
		n = n - 1;
		var s = 1.70158;
		return Math.pow(n, 2) * ((s + 1) * n + s) + 1;
	},

	backInOut: function(/* Decimal? */n){
		// summary:
		//		An easing function combining the effects of `backIn` and `backOut`
		//
		// description:
		//		An easing function combining the effects of `backIn` and `backOut`.
		//		Use caution when the easing will cause values to become negative
		//		as some properties cannot be set to negative values.
		var s = 1.70158 * 1.525;
		n = n * 2;
		if(n < 1){ return (Math.pow(n, 2) * ((s + 1) * n - s)) / 2; }
		n-=2;
		return (Math.pow(n, 2) * ((s + 1) * n + s) + 2) / 2;
	},

	elasticIn: function(/* Decimal? */n){
		// summary:
		//		An easing function the elastically snaps from the start value
		//
		// description:
		//		An easing function the elastically snaps from the start value
		//
		//		Use caution when the elasticity will cause values to become negative
		//		as some properties cannot be set to negative values.
		if(n == 0 || n == 1){ return n; }
		var p = .3;
		var s = p / 4;
		n = n - 1;
		return -1 * Math.pow(2, 10 * n) * Math.sin((n - s) * (2 * Math.PI) / p);
	},

	elasticOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that elasticly snaps around the target value,
		//		near the end of the Animation
		//
		// description:
		//		An easing function that elasticly snaps around the target value,
		//		near the end of the Animation
		//
		//		Use caution when the elasticity will cause values to become
		//		negative as some properties cannot be set to negative values.
		if(n==0 || n == 1){ return n; }
		var p = .3;
		var s = p / 4;
		return Math.pow(2, -10 * n) * Math.sin((n - s) * (2 * Math.PI) / p) + 1;
	},

	elasticInOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that elasticly snaps around the value, near
		//		the beginning and end of the Animation.
		//
		// description:
		//		An easing function that elasticly snaps around the value, near
		//		the beginning and end of the Animation.
		//
		//		Use caution when the elasticity will cause values to become
		//		negative as some properties cannot be set to negative values.
		if(n == 0) return 0;
		n = n * 2;
		if(n == 2) return 1;
		var p = .3 * 1.5;
		var s = p / 4;
		if(n < 1){
			n -= 1;
			return -.5 * (Math.pow(2, 10 * n) * Math.sin((n - s) * (2 * Math.PI) / p));
		}
		n -= 1;
		return .5 * (Math.pow(2, -10 * n) * Math.sin((n - s) * (2 * Math.PI) / p)) + 1;
	},

	bounceIn: function(/* Decimal? */n){
		// summary:
		//		An easing function that 'bounces' near the beginning of an Animation
		return (1 - dojo.fx.easing.bounceOut(1 - n)); // Decimal
	},

	bounceOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that 'bounces' near the end of an Animation
		var s = 7.5625;
		var p = 2.75;
		var l;
		if(n < (1 / p)){
			l = s * Math.pow(n, 2);
		}else if(n < (2 / p)){
			n -= (1.5 / p);
			l = s * Math.pow(n, 2) + .75;
		}else if(n < (2.5 / p)){
			n -= (2.25 / p);
			l = s * Math.pow(n, 2) + .9375;
		}else{
			n -= (2.625 / p);
			l = s * Math.pow(n, 2) + .984375;
		}
		return l;
	},

	bounceInOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that 'bounces' at the beginning and end of the Animation
		if(n < 0.5){ return dojo.fx.easing.bounceIn(n * 2) / 2; }
		return (dojo.fx.easing.bounceOut(n * 2 - 1) / 2) + 0.5; // Decimal
	}
};

}

if(!dojo._hasResource["dojox.mobile.app.ImageView"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app.ImageView"] = true;
dojo.provide("dojox.mobile.app.ImageView");
dojo.experimental("dojox.mobile.app.ImageView");




dojo.declare("dojox.mobile.app.ImageView", dojox.mobile.app._Widget, {

	// zoom: Number
	//		The current level of zoom.  This should not be set manually.
	zoom: 1,

	// zoomCenterX: Number
	//		The X coordinate in the image where the zoom is focused
	zoomCenterX: 0,

	// zoomCenterY: Number
	//		The Y coordinate in the image where the zoom is focused
	zoomCenterY: 0,

	// maxZoom: Number
	//		The highest degree to which an image can be zoomed.  For example,
	//		a maxZoom of 5 means that the image will be 5 times larger than normal
	maxZoom: 5,

	// autoZoomLevel: Number
	//		The degree to which the image is zoomed when auto zoom is invoked.
	//		The higher the number, the more the image is zoomed in.
	autoZoomLevel: 3,

	// disableAutoZoom: Boolean
	//		Disables auto zoom
	disableAutoZoom: false,

	// disableSwipe: Boolean
	//		Disables the users ability to swipe from one image to the next.
	disableSwipe: false,

	// autoZoomEvent: String
	//		Overrides the default event listened to which invokes auto zoom
	autoZoomEvent: null,

	// _leftImg: Node
	//		The full sized image to the left
	_leftImg: null,

	// _centerImg: Node
	//		The full sized image in the center
	_centerImg: null,

	// _rightImg: Node
	//		The full sized image to the right
	_rightImg: null,

	// _leftImg: Node
	//		The small sized image to the left
	_leftSmallImg: null,

	// _centerImg: Node
	//		The small sized image in the center
	_centerSmallImg: null,

	// _rightImg: Node
	//		The small sized image to the right
	_rightSmallImg: null,

	constructor: function(){

		this.panX = 0;
		this.panY = 0;

		this.handleLoad = dojo.hitch(this, this.handleLoad);
		this._updateAnimatedZoom = dojo.hitch(this, this._updateAnimatedZoom);
		this._updateAnimatedPan = dojo.hitch(this, this._updateAnimatedPan);
		this._onAnimPanEnd = dojo.hitch(this, this._onAnimPanEnd);
	},

	buildRendering: function(){
		this.inherited(arguments);

		this.canvas = dojo.create("canvas", {}, this.domNode);

		dojo.addClass(this.domNode, "mblImageView");
	},

	postCreate: function(){
		this.inherited(arguments);

		this.size = dojo.marginBox(this.domNode);

		dojo.style(this.canvas, {
			width: this.size.w + "px",
			height: this.size.h + "px"
		});
		this.canvas.height = this.size.h;
		this.canvas.width = this.size.w;

		var _this = this;

		// Listen to the mousedown/touchstart event.  Record the position
		// so we can use it to pan the image.
		this.connect(this.domNode, "onmousedown", function(event){
			if(_this.isAnimating()){
				return;
			}
			if(_this.panX){
				_this.handleDragEnd();
			}

			_this.downX = event.targetTouches ? event.targetTouches[0].clientX : event.clientX;
			_this.downY = event.targetTouches ? event.targetTouches[0].clientY : event.clientY;
		});

		// record the movement of the mouse.
		this.connect(this.domNode, "onmousemove", function(event){
			if(_this.isAnimating()){
				return;
			}
			if((!_this.downX && _this.downX !== 0) || (!_this.downY && _this.downY !== 0)){
				// If the touch didn't begin on this widget, ignore the movement
				return;
			}

			if((!_this.disableSwipe && _this.zoom == 1)
				|| (!_this.disableAutoZoom && _this.zoom != 1)){
				var x = event.targetTouches ?
							event.targetTouches[0].clientX : event.pageX;
				var y = event.targetTouches ?
							event.targetTouches[0].clientY : event.pageY;

				_this.panX = x - _this.downX;
				_this.panY = y - _this.downY;

				if(_this.zoom == 1){
					// If not zoomed in, then try to move to the next or prev image
					// but only if the mouse has moved more than 10 pixels
					// in the X direction
					if(Math.abs(_this.panX) > 10){
						_this.render();
					}
				}else{
					// If zoomed in, pan the image if the mouse has moved more
					// than 10 pixels in either direction.
					if(Math.abs(_this.panX) > 10 || Math.abs(_this.panY) > 10){
						_this.render();
					}
				}
			}
		});

		this.connect(this.domNode, "onmouseout", function(event){
			if(!_this.isAnimating() && _this.panX){
				_this.handleDragEnd();
			}
		});

		this.connect(this.domNode, "onmouseover", function(event){
			_this.downX = _this.downY = null;
		});

		// Set up AutoZoom, which zooms in a fixed amount when the user taps
		// a part of the canvas
		this.connect(this.domNode, "onclick", function(event){
			if(_this.isAnimating()){
				return;
			}
			if(_this.downX == null || _this.downY == null){
				return;
			}

			var x = (event.targetTouches ?
						event.targetTouches[0].clientX : event.pageX);
			var y = (event.targetTouches ?
						event.targetTouches[0].clientY : event.pageY);

			// If the mouse/finger has moved more than 14 pixels from where it
			// started, do not treat it as a click.  It is a drag.
			if(Math.abs(_this.panX) > 14 || Math.abs(_this.panY) > 14){
				_this.downX = _this.downY = null;
				_this.handleDragEnd();
				return;
			}
			_this.downX = _this.downY = null;

			if(!_this.disableAutoZoom){

				if(!_this._centerImg || !_this._centerImg._loaded){
					// Do nothing until the image is loaded
					return;
				}
				if(_this.zoom != 1){
					_this.set("animatedZoom", 1);
					return;
				}

				var pos = dojo._abs(_this.domNode);

				// Translate the clicked point to a point on the source image
				var xRatio = _this.size.w / _this._centerImg.width;
				var yRatio = _this.size.h / _this._centerImg.height;

				// Do an animated zoom to the point which was clicked.
				_this.zoomTo(
					((x - pos.x) / xRatio) - _this.panX,
					((y - pos.y) / yRatio) - _this.panY,
					_this.autoZoomLevel);
			}
		});

		// Listen for Flick events
		dojo.connect(this.domNode, "flick", this, "handleFlick");
	},

	isAnimating: function(){
		// summary:
		//		Returns true if an animation is in progress, false otherwise.
		return this._anim && this._anim.status() == "playing";
	},

	handleDragEnd: function(){
		// summary:
		//		Handles the end of a dragging event. If not zoomed in, it
		//		determines if the next or previous image should be transitioned
		//		to.
		this.downX = this.downY = null;
		console.log("handleDragEnd");

		if(this.zoom == 1){
			if(!this.panX){
				return;
			}

			var leftLoaded = (this._leftImg && this._leftImg._loaded)
							|| (this._leftSmallImg && this._leftSmallImg._loaded);
			var rightLoaded = (this._rightImg && this._rightImg._loaded)
							|| (this._rightSmallImg && this._rightSmallImg._loaded);

			// Check if the drag has moved the image more than half its length.
			// If so, move to either the previous or next image.
			var doMove =
				!(Math.abs(this.panX) < this._centerImg._baseWidth / 2) &&
				(
					(this.panX > 0 && leftLoaded ? 1 : 0) ||
					(this.panX < 0 && rightLoaded ? 1 : 0)
				);


			if(!doMove){
				// If not moving to another image, animate the sliding of the
				// image back into place.
				this._animPanTo(0, dojo.fx.easing.expoOut, 700);
			}else{
				// Move to another image.
				this.moveTo(this.panX);
			}
		}else{
			if(!this.panX && !this.panY){
				return;
			}
			// Recenter the zoomed image based on where it was panned to
			// previously
			this.zoomCenterX -= (this.panX / this.zoom);
			this.zoomCenterY -= (this.panY / this.zoom);

			this.panX = this.panY = 0;
		}

	},

	handleFlick: function(event){
		// summary:
		//		Handle a flick event.
		if(this.zoom == 1 && event.duration < 500){
			// Only handle quick flicks here, less than 0.5 seconds

			// If not zoomed in, then check if we should move to the next photo
			// or not
			if(event.direction == "ltr"){
				this.moveTo(1);
			}else if(event.direction == "rtl"){
				this.moveTo(-1);
			}
			// If an up or down flick occurs, it means nothing so ignore it
			this.downX = this.downY = null;
		}
	},

	moveTo: function(direction){
		direction = direction > 0 ? 1 : -1;
		var toImg;

		if(direction < 1){
			if(this._rightImg && this._rightImg._loaded){
				toImg = this._rightImg;
			}else if(this._rightSmallImg && this._rightSmallImg._loaded){
				toImg = this._rightSmallImg;
			}
		}else{
			if(this._leftImg && this._leftImg._loaded){
				toImg = this._leftImg;
			}else if(this._leftSmallImg && this._leftSmallImg._loaded){
				toImg = this._leftSmallImg;
			}
		}

		this._moveDir = direction;
		var _this = this;

		if(toImg && toImg._loaded){
			// If the image is loaded, make a linear animation to show it
			this._animPanTo(this.size.w * direction, null, 500, function(){
				_this.panX = 0;
				_this.panY = 0;

				if(direction < 0){
					// Moving to show the right image
					_this._switchImage("left", "right");
				}else{
					// Moving to show the left image
					_this._switchImage("right", "left");
				}

				_this.render();
				_this.onChange(direction * -1);
			});

		}else{
			// If the next image is not loaded, make an animation to
			// move the center image to half the width of the widget and back
			// again

			console.log("moveTo image not loaded!", toImg);

			this._animPanTo(0, dojo.fx.easing.expoOut, 700);
		}
	},

	_switchImage: function(toImg, fromImg){
		var toSmallImgName = "_" + toImg + "SmallImg";
		var toImgName = "_" + toImg + "Img";

		var fromSmallImgName = "_" + fromImg + "SmallImg";
		var fromImgName = "_" + fromImg + "Img";

		this[toImgName] = this._centerImg;
		this[toSmallImgName] = this._centerSmallImg;

		this[toImgName]._type = toImg;

		if(this[toSmallImgName]){
			this[toSmallImgName]._type = toImg;
		}

		this._centerImg = this[fromImgName];
		this._centerSmallImg = this[fromSmallImgName];
		this._centerImg._type = "center";

		if(this._centerSmallImg){
			this._centerSmallImg._type = "center";
		}
		this[fromImgName] = this[fromSmallImgName] = null;
	},

	_animPanTo: function(to, easing, duration, callback){
		this._animCallback = callback;
		this._anim = new dojo.Animation({
			curve: [this.panX, to],
			onAnimate: this._updateAnimatedPan,
			duration: duration || 500,
			easing: easing,
			onEnd: this._onAnimPanEnd
		});

		this._anim.play();
		return this._anim;
	},

	onChange: function(direction){
		// summary:
		//		Stub function that can be listened to in order to provide
		//		new images when the displayed image changes
	},

	_updateAnimatedPan: function(amount){
		this.panX = amount;
		this.render();
	},

	_onAnimPanEnd: function(){
		this.panX = this.panY = 0;

		if(this._animCallback){
			this._animCallback();
		}
	},

	zoomTo: function(centerX, centerY, zoom){
		this.set("zoomCenterX", centerX);
		this.set("zoomCenterY", centerY);

		this.set("animatedZoom", zoom);
	},

	render: function(){
		var cxt = this.canvas.getContext('2d');

		cxt.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Render the center image
		this._renderImg(
			this._centerSmallImg,
			this._centerImg,
			this.zoom == 1 ? (this.panX < 0 ? 1 : this.panX > 0 ? -1 : 0) : 0);

		if(this.zoom == 1 && this.panX != 0){
			if(this.panX > 0){
				// Render the left image, showing the right side of it
				this._renderImg(this._leftSmallImg, this._leftImg, 1);
			}else{
				// Render the right image, showing the left side of it
				this._renderImg(this._rightSmallImg, this._rightImg, -1);
			}
		}
	},

	_renderImg: function(smallImg, largeImg, panDir){
		// summary:
		//		Renders a single image


		// If zoomed, we just display the center img
		var img = (largeImg && largeImg._loaded) ? largeImg : smallImg;

		if(!img || !img._loaded){
			// If neither the large or small image is loaded, display nothing
			return;
		}
		var cxt = this.canvas.getContext('2d');

		var baseWidth = img._baseWidth;
		var baseHeight = img._baseHeight;

		// Calculate the size the image would be if there were no bounds
		var desiredWidth = baseWidth * this.zoom;
		var desiredHeight = baseHeight * this.zoom;

		// Calculate the actual size of the viewable image
		var destWidth = Math.min(this.size.w, desiredWidth);
		var destHeight = Math.min(this.size.h, desiredHeight);


		// Calculate the size of the window on the original image to use
		var sourceWidth = this.dispWidth = img.width * (destWidth / desiredWidth);
		var sourceHeight = this.dispHeight = img.height * (destHeight / desiredHeight);

		var zoomCenterX = this.zoomCenterX - (this.panX / this.zoom);
		var zoomCenterY = this.zoomCenterY - (this.panY / this.zoom);

		// Calculate where the center of the view should be
		var centerX = Math.floor(Math.max(sourceWidth / 2,
				Math.min(img.width - sourceWidth / 2, zoomCenterX)));
		var centerY = Math.floor(Math.max(sourceHeight / 2,
				Math.min(img.height - sourceHeight / 2, zoomCenterY)));


		var sourceX = Math.max(0,
			Math.round((img.width - sourceWidth)/2 + (centerX - img._centerX)) );
		var sourceY = Math.max(0,
			Math.round((img.height - sourceHeight) / 2 + (centerY - img._centerY))
						);

		var destX = Math.round(Math.max(0, this.canvas.width - destWidth)/2);
		var destY = Math.round(Math.max(0, this.canvas.height - destHeight)/2);

		var oldDestWidth = destWidth;
		var oldSourceWidth = sourceWidth;

		if(this.zoom == 1 && panDir && this.panX){

			if(this.panX < 0){
				if(panDir > 0){
					// If the touch is moving left, and the right side of the
					// image should be shown, then reduce the destination width
					// by the absolute value of panX
					destWidth -= Math.abs(this.panX);
					destX = 0;
				}else if(panDir < 0){
					// If the touch is moving left, and the left side of the
					// image should be shown, then set the displayed width
					// to the absolute value of panX, less some pixels for
					// a padding between images
					destWidth = Math.max(1, Math.abs(this.panX) - 5);
					destX = this.size.w - destWidth;
				}
			}else{
				if(panDir > 0){
					// If the touch is moving right, and the right side of the
					// image should be shown, then set the destination width
					// to the absolute value of the pan, less some pixels for
					// padding
					destWidth = Math.max(1, Math.abs(this.panX) - 5);
					destX = 0;
				}else if(panDir < 0){
					// If the touch is moving right, and the left side of the
					// image should be shown, then reduce the destination width
					// by the widget width minus the absolute value of panX
					destWidth -= Math.abs(this.panX);
					destX = this.size.w - destWidth;
				}
			}

			sourceWidth = Math.max(1,
						Math.floor(sourceWidth * (destWidth / oldDestWidth)));

			if(panDir > 0){
				// If the right side of the image should be displayed, move
				// the sourceX to be the width of the image minus the difference
				// between the original sourceWidth and the new sourceWidth
				sourceX = (sourceX + oldSourceWidth) - (sourceWidth);
			}
			sourceX = Math.floor(sourceX);
		}

		try{

			// See https://developer.mozilla.org/en/Canvas_tutorial/Using_images
			cxt.drawImage(
				img,
				Math.max(0, sourceX),
				sourceY,
				Math.min(oldSourceWidth, sourceWidth),
				sourceHeight,
				destX, 	// Xpos
				destY, // Ypos
				Math.min(oldDestWidth, destWidth),
				destHeight
			);
		}catch(e){
			console.log("Caught Error",e,

					"type=", img._type,
					"oldDestWidth = ", oldDestWidth,
					"destWidth", destWidth,
					"destX", destX
					, "oldSourceWidth=",oldSourceWidth,
					"sourceWidth=", sourceWidth,
					"sourceX = " + sourceX
			);
		}
	},

	_setZoomAttr: function(amount){
		this.zoom = Math.min(this.maxZoom, Math.max(1, amount));

		if(this.zoom == 1
				&& this._centerImg
				&& this._centerImg._loaded){

			if(!this.isAnimating()){
				this.zoomCenterX = this._centerImg.width / 2;
				this.zoomCenterY = this._centerImg.height / 2;
			}
			this.panX = this.panY = 0;
		}

		this.render();
	},

	_setZoomCenterXAttr: function(value){
		if(value != this.zoomCenterX){
			if(this._centerImg && this._centerImg._loaded){
				value = Math.min(this._centerImg.width, value);
			}
			this.zoomCenterX = Math.max(0, Math.round(value));
		}
	},

	_setZoomCenterYAttr: function(value){
		if(value != this.zoomCenterY){
			if(this._centerImg && this._centerImg._loaded){
				value = Math.min(this._centerImg.height, value);
			}
			this.zoomCenterY = Math.max(0, Math.round(value));
		}
	},

	_setZoomCenterAttr: function(value){
		if(value.x != this.zoomCenterX || value.y != this.zoomCenterY){
			this.set("zoomCenterX", value.x);
			this.set("zoomCenterY", value.y);
			this.render();
		}
	},

	_setAnimatedZoomAttr: function(amount){
		if(this._anim && this._anim.status() == "playing"){
			return;
		}

		this._anim = new dojo.Animation({
			curve: [this.zoom, amount],
			onAnimate: this._updateAnimatedZoom,
			onEnd: this._onAnimEnd
		});

		this._anim.play();
	},

	_updateAnimatedZoom: function(amount){
		this._setZoomAttr(amount);
	},

	_setCenterUrlAttr: function(urlOrObj){
		this._setImage("center", urlOrObj);
	},
	_setLeftUrlAttr: function(urlOrObj){
		this._setImage("left", urlOrObj);
	},
	_setRightUrlAttr: function(urlOrObj){
		this._setImage("right", urlOrObj);
	},

	_setImage: function(name, urlOrObj){
		var smallUrl = null;

		var largeUrl = null;

		if(dojo.isString(urlOrObj)){
			// If the argument is a string, then just load the large url
			largeUrl = urlOrObj;
		}else{
			largeUrl = urlOrObj.large;
			smallUrl = urlOrObj.small;
		}

		if(this["_" + name + "Img"] && this["_" + name + "Img"]._src == largeUrl){
			// Identical URL, ignore it
			return;
		}

		// Just do the large image for now
		var largeImg = this["_" + name + "Img"] = new Image();
		largeImg._type = name;
		largeImg._loaded = false;
		largeImg._src = largeUrl;
		largeImg._conn = dojo.connect(largeImg, "onload", this.handleLoad);

		if(smallUrl){
			// If a url to a small version of the image has been provided,
			// load that image first.
			var smallImg = this["_" + name + "SmallImg"] = new Image();
			smallImg._type = name;
			smallImg._loaded = false;
			smallImg._conn = dojo.connect(smallImg, "onload", this.handleLoad);
			smallImg._isSmall = true;
			smallImg._src = smallUrl;
			smallImg.src = smallUrl;
		}

		// It's important that the large url's src is set after the small image
		// to ensure it's loaded second.
		largeImg.src = largeUrl;
	},

	handleLoad: function(evt){
		// summary:
		//		Handles the loading of an image, both the large and small
		//		versions.  A render is triggered as a result of each image load.

		var img = evt.target;
		img._loaded = true;

		dojo.disconnect(img._conn);

		var type = img._type;

		switch(type){
			case "center":
				this.zoomCenterX = img.width / 2;
				this.zoomCenterY = img.height / 2;
				break;
		}

		var height = img.height;
		var width = img.width;

		if(width / this.size.w < height / this.size.h){
			// Fit the height to the height of the canvas
			img._baseHeight = this.canvas.height;
			img._baseWidth = width / (height / this.size.h);
		}else{
			// Fix the width to the width of the canvas
			img._baseWidth = this.canvas.width;
			img._baseHeight = height / (width / this.size.w);
		}
		img._centerX = width / 2;
		img._centerY = height / 2;

		this.render();

		this.onLoad(img._type, img._src, img._isSmall);
	},

	onLoad: function(type, url, isSmall){
		// summary:
		//		Dummy function that is called whenever an image loads.
		// type: String
		//		The position of the image that has loaded, either
		//		"center", "left" or "right"
		// url: String
		//		The src of the image
		// isSmall: Boolean
		//		True if it is a small version of the image that has loaded,
		//		false otherwise.
	}
});

}

if(!dojo._hasResource["dojox.mobile.app.ImageThumbView"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app.ImageThumbView"] = true;
dojo.provide("dojox.mobile.app.ImageThumbView");
dojo.experimental("dojox.mobile.app.ImageThumbView");




dojo.declare("dojox.mobile.app.ImageThumbView", dijit._WidgetBase, {
	// summary:
	//		An image thumbnail gallery

	// items: Array
	//		The data items from which the image urls are retrieved.
	//		If an item is a string, it is expected to be a URL. Otherwise
	//		by default it is expected to have a 'url' member.  This can
	//		be configured using the 'urlParam' attribute on this widget.
	items: [],

	// urlParam: String
	//		The paramter name used to retrieve an image url from a JSON object
	urlParam: "url",

	labelParam: null,

	itemTemplate: '<div class="mblThumbInner">' +
				'<div class="mblThumbOverlay"></div>' +
				'<div class="mblThumbMask">' +
					'<div class="mblThumbSrc" style="background-image:url(${url})"></div>' +
				'</div>' +
			'</div>',

	minPadding: 4,

	maxPerRow: 3,

	maxRows: -1,

	baseClass: "mblImageThumbView",

	thumbSize: "medium",

	animationEnabled: true,

	selectedIndex: -1,

	cache: null,

	cacheMustMatch: false,

	clickEvent: "onclick",

	cacheBust: false,

	disableHide: false,

	constructor: function(params, node){
	},

	postCreate: function(){

		this.inherited(arguments);
		var _this = this;

		var hoverCls = "mblThumbHover";

		this.addThumb = dojo.hitch(this, this.addThumb);
		this.handleImgLoad = dojo.hitch(this, this.handleImgLoad);
		this.hideCached = dojo.hitch(this, this.hideCached);

		this._onLoadImages = {};

		this.cache = [];
		this.visibleImages = [];

		this._cacheCounter = 0;

		this.connect(this.domNode, this.clickEvent, function(event){
			var itemNode = _this._getItemNodeFromEvent(event);

			if(itemNode && !itemNode._cached){
				_this.onSelect(itemNode._item, itemNode._index, _this.items);
				dojo.query(".selected", this.domNode).removeClass("selected");
				dojo.addClass(itemNode, "selected");
			}
		});

		dojo.addClass(this.domNode, this.thumbSize);

		this.resize();
		this.render();
	},

	onSelect: function(item, index, items){
		// summary:
		//		Dummy function that is triggered when an image is selected.
	},

	_setAnimationEnabledAttr: function(value){
		this.animationEnabled = value;
		dojo[value ? "addClass" : "removeClass"](this.domNode, "animated");
	},

	_setItemsAttr: function(items){
		this.items = items || [];

		var urls = {};
		var i;
		for(i = 0; i < this.items.length; i++){
			urls[this.items[i][this.urlParam]] = 1;
		}

		var clearedUrls = [];
		for(var url in this._onLoadImages){
			if(!urls[url] && this._onLoadImages[url]._conn){
				dojo.disconnect(this._onLoadImages[url]._conn);
				this._onLoadImages[url].src = null;
				clearedUrls.push(url);
			}
		}

		for(i = 0; i < clearedUrls.length; i++){
			delete this._onLoadImages[url];
		}

		this.render();
	},

	_getItemNode: function(node){
		while(node && !dojo.hasClass(node, "mblThumb") && node != this.domNode){
			node = node.parentNode;
		}

		return (node == this.domNode) ? null : node;
	},

	_getItemNodeFromEvent: function(event){
		if(event.touches && event.touches.length > 0){
			event = event.touches[0];
		}
		return this._getItemNode(event.target);
	},

	resize: function(){
		this._thumbSize = null;

		this._size = dojo.contentBox(this.domNode);

		this.disableHide = true;
		this.render();
		this.disableHide = false;
	},

	hideCached: function(){
		// summary:
		//		Hides all cached nodes, so that they're no invisible and overlaying
		//		other screen elements.
		for(var i = 0; i < this.cache.length; i++){
			if (this.cache[i]) {
				dojo.style(this.cache[i], "display", "none");
			}
		}
	},

	render: function(){
		var i;
		var url;
		var item;

		var thumb;
		while(this.visibleImages && this.visibleImages.length > 0){
			thumb = this.visibleImages.pop();
			this.cache.push(thumb);

			if (!this.disableHide) {
				dojo.addClass(thumb, "hidden");
			}
			thumb._cached = true;
		}

		if(this.cache && this.cache.length > 0){
			setTimeout(this.hideCached, 1000);
		}

		if(!this.items || this.items.length == 0){
			return;
		}

		for(i = 0; i < this.items.length; i++){
			item = this.items[i];
			url = (dojo.isString(item) ? item : item[this.urlParam]);

			this.addThumb(item, url, i);

			if(this.maxRows > 0 && (i + 1) / this.maxPerRow >= this.maxRows){
				break;
			}
		}

		if(!this._thumbSize){
			return;
		}

		var column = 0;
		var row = -1;

		var totalThumbWidth = this._thumbSize.w + (this.padding * 2);
		var totalThumbHeight = this._thumbSize.h + (this.padding * 2);

		var nodes = this.thumbNodes =
			dojo.query(".mblThumb", this.domNode);

		var pos = 0;
		nodes = this.visibleImages;
		for(i = 0; i < nodes.length; i++){
			if(nodes[i]._cached){
				continue;
			}

			if(pos % this.maxPerRow == 0){
				row ++;
			}
			column = pos % this.maxPerRow;

			this.place(
				nodes[i],
				(column * totalThumbWidth) + this.padding,	// x position
				(row * totalThumbHeight) + this.padding		// y position
			);

			if(!nodes[i]._loading){
				dojo.removeClass(nodes[i], "hidden");
			}

			if(pos == this.selectedIndex){
				dojo[pos == this.selectedIndex ? "addClass" : "removeClass"]
					(nodes[i], "selected");
			}
			pos++;
		}

		var numRows = Math.ceil(pos / this.maxPerRow);

		this._numRows = numRows;

		this.setContainerHeight((numRows * (this._thumbSize.h + this.padding * 2)));
	},

	setContainerHeight: function(amount){
		dojo.style(this.domNode, "height", amount + "px");
	},

	addThumb: function(item, url, index){

		var thumbDiv;
		var cacheHit = false;
		if(this.cache.length > 0){
			// Reuse a previously created node if possible
			var found = false;
			// Search for an image with the same url first
			for(var i = 0; i < this.cache.length; i++){
				if(this.cache[i]._url == url){
					thumbDiv = this.cache.splice(i, 1)[0];
					found = true;
					break
				}
			}

			// if no image with the same url is found, just take the last one
			if(!thumbDiv && !this.cacheMustMatch){
            	thumbDiv = this.cache.pop();
				dojo.removeClass(thumbDiv, "selected");
			} else {
				cacheHit = true;
			}
		}

		if(!thumbDiv){

			// Create a new thumb
			thumbDiv = dojo.create("div", {
				"class": "mblThumb hidden",
				innerHTML: dojo.string.substitute(this.itemTemplate, {
					url: url
				}, null, this)
			}, this.domNode);
		}

		if(this.labelParam) {
			var labelNode = dojo.query(".mblThumbLabel", thumbDiv)[0];
			if(!labelNode) {
				labelNode = dojo.create("div", {
					"class": "mblThumbLabel"
				}, thumbDiv);
			}
			labelNode.innerHTML = item[this.labelParam] || "";
		}

	    dojo.style(thumbDiv, "display", "");
		if (!this.disableHide) {
			dojo.addClass(thumbDiv, "hidden");
		}

		if (!cacheHit) {
			var loader = dojo.create("img", {});
			loader._thumbDiv = thumbDiv;
			loader._conn = dojo.connect(loader, "onload", this.handleImgLoad);
			loader._url = url;
			thumbDiv._loading = true;

			this._onLoadImages[url] = loader;
			if (loader) {
				loader.src = url;
			}
		}
		this.visibleImages.push(thumbDiv);

		thumbDiv._index = index;
		thumbDiv._item = item;
		thumbDiv._url = url;
		thumbDiv._cached = false;

		if(!this._thumbSize){
			this._thumbSize = dojo.marginBox(thumbDiv);

			if(this._thumbSize.h == 0){
				this._thumbSize.h = 100;
				this._thumbSize.w = 100;
			}

			if(this.labelParam){
				this._thumbSize.h += 8;
			}

			this.calcPadding();
		}
	},

	handleImgLoad: function(event){
		var img = event.target;
		dojo.disconnect(img._conn);
		dojo.removeClass(img._thumbDiv, "hidden");
		img._thumbDiv._loading = false;
		img._conn = null;

		var url = img._url;
		if(this.cacheBust){
			url += (url.indexOf("?") > -1 ? "&" : "?")
				+ "cacheBust=" + (new Date()).getTime() + "_" + (this._cacheCounter++);
		}

		dojo.query(".mblThumbSrc", img._thumbDiv)
				.style("backgroundImage", "url(" + url + ")");

		delete this._onLoadImages[img._url];
	},

	calcPadding: function(){
		var width = this._size.w;

		var thumbWidth = this._thumbSize.w;

		var imgBounds = thumbWidth + this.minPadding;

		this.maxPerRow = Math.floor(width / imgBounds);

		this.padding = Math.floor((width - (thumbWidth * this.maxPerRow)) / (this.maxPerRow * 2));
	},

	place: function(node, x, y){
		dojo.style(node, {
			"-webkit-transform" :"translate(" + x + "px," + y + "px)"
		});
	},

	destroy: function(){
		// Stop the loading of any more images

		var img;
		var counter = 0;
		for (var url in this._onLoadImages){
			img = this._onLoadImages[url];
			if (img) {
				img.src = null;
				counter++;
			}
		}

		this.inherited(arguments);
	}
});

}

if(!dojo._hasResource["dojox.mobile.app._base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app._base"] = true;
dojo.provide("dojox.mobile.app._base");
dojo.experimental("dojox.mobile.app._base");


















(function(){

	var stageController;
	var appInfo;

	var jsDependencies = [
		"dojox.mobile",
		"dojox.mobile.parser"
	];

	var loadedResources = {};
	var loadingDependencies;

	var rootNode;

	var sceneResources = [];

	// Load the required resources asynchronously, since not all mobile OSes
	// support dojo.require and sync XHR
	function loadResources(resources, callback){
		// summary:
		//		Loads one or more JavaScript files asynchronously. When complete,
		//		the first scene is pushed onto the stack.
		// resources:
		//		An array of module names, e.g. 'dojox.mobile.AlertDialog'

		var resource;
		var url;

		do {
			resource = resources.pop();
			if (resource.source) {
				url = resource.source;
			}else if (resource.module) {
				url = dojo.baseUrl + dojo._getModuleSymbols(resource.module).join("/") + '.js';
			}else {
				alert("Error: invalid JavaScript resource " + dojo.toJson(resource));
				return;
			}
		}while (resources.length > 0 && loadedResources[url]);

		if(resources.length < 1 && loadedResources[url]){
			// All resources have already been loaded
			callback();
			return;
		}

		dojo.xhrGet({
			url: url,
			sync: false
		}).addCallbacks(function(text){
			dojo["eval"](text);
			loadedResources[url] = true;
			if(resources.length > 0){
				loadResources(resources, callback);
			}else{
				callback();
			}
		},
		function(){
			alert("Failed to load resource " + url);
		});
	}

	var pushFirstScene = function(){
		// summary:
		//		Pushes the first scene onto the stack.

		stageController = new dojox.mobile.app.StageController(rootNode);
		var defaultInfo = {
			id: "com.test.app",
			version: "1.0.0",
			initialScene: "main"
		};

		// If the application info has been defined, as it should be,
		// use it.
		if(dojo.global["appInfo"]){
			dojo.mixin(defaultInfo, dojo.global["appInfo"]);
		}
		appInfo = dojox.mobile.app.info = defaultInfo;

		// Set the document title from the app info title if it exists
		if(appInfo.title){
			var titleNode = dojo.query("head title")[0] ||
							dojo.create("title", {},dojo.query("head")[0]);
			document.title = appInfo.title;
		}

		stageController.pushScene(appInfo.initialScene);
	};

	var initBackButton = function(){
		var hasNativeBack = false;
		if(dojo.global.BackButton){
			// Android phonegap support
			BackButton.override();
			dojo.connect(document, 'backKeyDown', function(e) {
				dojo.publish("/dojox/mobile/app/goback");
			});
			hasNativeBack = true;
		}else if(dojo.global.Mojo){
			// TODO: add webOS support
		}
		if(hasNativeBack){
			dojo.addClass(dojo.body(), "mblNativeBack");
		}
	};

	dojo.mixin(dojox.mobile.app, {
		init: function(node){
			// summary:
			//    Initializes the mobile app. Creates the

			rootNode = node || dojo.body();
			dojox.mobile.app.STAGE_CONTROLLER_ACTIVE = true;

			dojo.subscribe("/dojox/mobile/app/goback", function(){
				stageController.popScene();
			});

			dojo.subscribe("/dojox/mobile/app/alert", function(params){
				dojox.mobile.app.getActiveSceneController().showAlertDialog(params);
			});

			dojo.subscribe("/dojox/mobile/app/pushScene", function(sceneName, params){
				stageController.pushScene(sceneName, params || {});
			});

			// Get the list of files to load per scene/view
			dojo.xhrGet({
				url: "view-resources.json",
				load: function(data){
					var resources = [];

					if(data){
						// Should be an array
						sceneResources = data = dojo.fromJson(data);

						// Get the list of files to load that have no scene
						// specified, and therefore should be loaded on
						// startup
						for(var i = 0; i < data.length; i++){
							if(!data[i].scene){
								resources.push(data[i]);
							}
						}
					}
					if(resources.length > 0){
						loadResources(resources, pushFirstScene);
					}else{
						pushFirstScene();
					}
				},
				error: pushFirstScene
			});

			initBackButton();
		},

		getActiveSceneController: function(){
			// summary:
			//		Gets the controller for the active scene.

			return stageController.getActiveSceneController();
		},

		getStageController: function(){
			// summary:
			//		Gets the stage controller.
			return stageController;
		},

		loadResources: function(resources, callback){
			loadResources(resources, callback);
		},

		loadResourcesForScene: function(sceneName, callback){
			var resources = [];

			// Get the list of files to load that have no scene
			// specified, and therefore should be loaded on
			// startup
			for(var i = 0; i < sceneResources.length; i++){
				if(sceneResources[i].scene == sceneName){
					resources.push(sceneResources[i]);
				}
			}

			if(resources.length > 0){
				loadResources(resources, callback);
			}else{
				callback();
			}
		},

		resolveTemplate: function(sceneName){
			// summary:
			//		Given the name of a scene, returns the path to it's template
			//		file.  For example, for a scene named 'main', the file
			//		returned is 'app/views/main/main-scene.html'
			//		This function can be overridden if it is desired to have
			//		a different name to file mapping.
			return "app/views/" + sceneName + "/" + sceneName + "-scene.html";
		},

		resolveAssistant: function(sceneName){
			// summary:
			//		Given the name of a scene, returns the path to it's assistant
			//		file.  For example, for a scene named 'main', the file
			//		returned is 'app/assistants/main-assistant.js'
			//		This function can be overridden if it is desired to have
			//		a different name to file mapping.
			return "app/assistants/" + sceneName + "-assistant.js";
		}
	});
})();

}

if(!dojo._hasResource["dojox.mobileApp"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobileApp"] = true;
dojo.provide("dojox.mobileApp");



}

