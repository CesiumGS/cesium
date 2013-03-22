define([
	"require",
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/_base/event", // event.stop
	"dojo/dom", // dom.byId dom.isDescendant
	"dojo/dom-attr", // domAttr.get domAttr.set domAttr.has domAttr.remove
	"dojo/dom-geometry", // domStyle.getComputedStyle domGeometry.position
	"dojo/dom-style", // domStyle.getComputedStyle
	"dojo/keys",	// keys.F10
	"dojo/_base/lang", // lang.hitch
	"dojo/on",
	"dojo/sniff", // has("ie"), has("quirks")
	"dojo/_base/window", // win.body win.doc.documentElement win.doc.frames
	"dojo/window", // winUtils.get
	"./popup",
	"./DropDownMenu",
	"dojo/ready"
], function(require, array, declare, event, dom, domAttr, domGeometry, domStyle, keys, lang, on,
			has, win, winUtils, pm, DropDownMenu, ready){

// module:
//		dijit/Menu

// Back compat w/1.6, remove for 2.0
if(has("dijit-legacy-requires")){
	ready(0, function(){
		var requires = ["dijit/MenuItem", "dijit/PopupMenuItem", "dijit/CheckedMenuItem", "dijit/MenuSeparator"];
		require(requires);	// use indirection so modules not rolled into a build
	});
}

return declare("dijit.Menu", DropDownMenu, {
	// summary:
	//		A context menu you can assign to multiple elements

	constructor: function(/*===== params, srcNodeRef =====*/){
		// summary:
		//		Create the widget.
		// params: Object|null
		//		Hash of initialization parameters for widget, including scalar values (like title, duration etc.)
		//		and functions, typically callbacks like onClick.
		//		The hash can contain any of the widget's properties, excluding read-only properties.
		// srcNodeRef: DOMNode|String?
		//		If a srcNodeRef (DOM node) is specified:
		//
		//		- use srcNodeRef.innerHTML as my contents
		//		- replace srcNodeRef with my generated DOM tree

		this._bindings = [];
	},

	// targetNodeIds: [const] String[]
	//		Array of dom node ids of nodes to attach to.
	//		Fill this with nodeIds upon widget creation and it becomes context menu for those nodes.
	targetNodeIds: [],

	// selector: String?
	//		CSS expression to apply this Menu to descendants of targetNodeIds, rather than to
	//		the nodes specified by targetNodeIds themselves.    Useful for applying a Menu to
	//		a range of rows in a table, tree, etc.
	//
	//		The application must require() an appropriate level of dojo/query to handle the selector.
	selector: "",

	// TODO: in 2.0 remove support for multiple targetNodeIds.   selector gives the same effect.
	// So, change targetNodeIds to a targetNodeId: "", remove bindDomNode()/unBindDomNode(), etc.

/*=====
	// currentTarget: [readonly] DOMNode
	//		For context menus, set to the current node that the Menu is being displayed for.
	//		Useful so that the menu actions can be tailored according to the node
	currentTarget: null,
=====*/

	// contextMenuForWindow: [const] Boolean
	//		If true, right clicking anywhere on the window will cause this context menu to open.
	//		If false, must specify targetNodeIds.
	contextMenuForWindow: false,

	// leftClickToOpen: [const] Boolean
	//		If true, menu will open on left click instead of right click, similar to a file menu.
	leftClickToOpen: false,

	// refocus: Boolean
	//		When this menu closes, re-focus the element which had focus before it was opened.
	refocus: true,

	postCreate: function(){
		if(this.contextMenuForWindow){
			this.bindDomNode(this.ownerDocumentBody);
		}else{
			// TODO: should have _setTargetNodeIds() method to handle initialization and a possible
			// later set('targetNodeIds', ...) call.  There's also a problem that targetNodeIds[]
			// gets stale after calls to bindDomNode()/unBindDomNode() as it still is just the original list (see #9610)
			array.forEach(this.targetNodeIds, this.bindDomNode, this);
		}
		this.inherited(arguments);
	},

	// thanks burstlib!
	_iframeContentWindow: function(/* HTMLIFrameElement */iframe_el){
		// summary:
		//		Returns the window reference of the passed iframe
		// tags:
		//		private
		return winUtils.get(this._iframeContentDocument(iframe_el)) ||
			// Moz. TODO: is this available when defaultView isn't?
			this._iframeContentDocument(iframe_el)['__parent__'] ||
			(iframe_el.name && win.doc.frames[iframe_el.name]) || null;	//	Window
	},

	_iframeContentDocument: function(/* HTMLIFrameElement */iframe_el){
		// summary:
		//		Returns a reference to the document object inside iframe_el
		// tags:
		//		protected
		return iframe_el.contentDocument // W3
			|| (iframe_el.contentWindow && iframe_el.contentWindow.document) // IE
			|| (iframe_el.name && win.doc.frames[iframe_el.name] && win.doc.frames[iframe_el.name].document)
			|| null;	//	HTMLDocument
	},

	bindDomNode: function(/*String|DomNode*/ node){
		// summary:
		//		Attach menu to given node
		node = dom.byId(node, this.ownerDocument);

		var cn;	// Connect node

		// Support context menus on iframes.  Rather than binding to the iframe itself we need
		// to bind to the <body> node inside the iframe.
		if(node.tagName.toLowerCase() == "iframe"){
			var iframe = node,
				window = this._iframeContentWindow(iframe);
			cn = win.body(window.document);
		}else{
			// To capture these events at the top level, attach to <html>, not <body>.
			// Otherwise right-click context menu just doesn't work.
			cn = (node == win.body(this.ownerDocument) ? this.ownerDocument.documentElement : node);
		}


		// "binding" is the object to track our connection to the node (ie, the parameter to bindDomNode())
		var binding = {
			node: node,
			iframe: iframe
		};

		// Save info about binding in _bindings[], and make node itself record index(+1) into
		// _bindings[] array.  Prefix w/_dijitMenu to avoid setting an attribute that may
		// start with a number, which fails on FF/safari.
		domAttr.set(node, "_dijitMenu" + this.id, this._bindings.push(binding));

		// Setup the connections to monitor click etc., unless we are connecting to an iframe which hasn't finished
		// loading yet, in which case we need to wait for the onload event first, and then connect
		// On linux Shift-F10 produces the oncontextmenu event, but on Windows it doesn't, so
		// we need to monitor keyboard events in addition to the oncontextmenu event.
		var doConnects = lang.hitch(this, function(cn){
			var selector = this.selector,
				delegatedEvent = selector ?
					function(eventType){ return on.selector(selector, eventType); } :
					function(eventType){ return eventType; },
				self = this;
			return [
				// TODO: when leftClickToOpen is true then shouldn't space/enter key trigger the menu,
				// rather than shift-F10?
				on(cn, delegatedEvent(this.leftClickToOpen ? "click" : "contextmenu"), function(evt){
					// Schedule context menu to be opened unless it's already been scheduled from onkeydown handler
					event.stop(evt);
					self._scheduleOpen(this, iframe, {x: evt.pageX, y: evt.pageY});
				}),
				on(cn, delegatedEvent("keydown"), function(evt){
					if(evt.shiftKey && evt.keyCode == keys.F10){
						event.stop(evt);
						self._scheduleOpen(this, iframe);	// no coords - open near target node
					}
				})
			];
		});
		binding.connects = cn ? doConnects(cn) : [];

		if(iframe){
			// Setup handler to [re]bind to the iframe when the contents are initially loaded,
			// and every time the contents change.
			// Need to do this b/c we are actually binding to the iframe's <body> node.
			// Note: can't use connect.connect(), see #9609.

			binding.onloadHandler = lang.hitch(this, function(){
				// want to remove old connections, but IE throws exceptions when trying to
				// access the <body> node because it's already gone, or at least in a state of limbo

				var window = this._iframeContentWindow(iframe);
					cn = win.body(window.document)
				binding.connects = doConnects(cn);
			});
			if(iframe.addEventListener){
				iframe.addEventListener("load", binding.onloadHandler, false);
			}else{
				iframe.attachEvent("onload", binding.onloadHandler);
			}
		}
	},

	unBindDomNode: function(/*String|DomNode*/ nodeName){
		// summary:
		//		Detach menu from given node

		var node;
		try{
			node = dom.byId(nodeName, this.ownerDocument);
		}catch(e){
			// On IE the dom.byId() call will get an exception if the attach point was
			// the <body> node of an <iframe> that has since been reloaded (and thus the
			// <body> node is in a limbo state of destruction.
			return;
		}

		// node["_dijitMenu" + this.id] contains index(+1) into my _bindings[] array
		var attrName = "_dijitMenu" + this.id;
		if(node && domAttr.has(node, attrName)){
			var bid = domAttr.get(node, attrName)-1, b = this._bindings[bid], h;
			while((h = b.connects.pop())){
				h.remove();
			}

			// Remove listener for iframe onload events
			var iframe = b.iframe;
			if(iframe){
				if(iframe.removeEventListener){
					iframe.removeEventListener("load", b.onloadHandler, false);
				}else{
					iframe.detachEvent("onload", b.onloadHandler);
				}
			}

			domAttr.remove(node, attrName);
			delete this._bindings[bid];
		}
	},

	_scheduleOpen: function(/*DomNode?*/ target, /*DomNode?*/ iframe, /*Object?*/ coords){
		// summary:
		//		Set timer to display myself.  Using a timer rather than displaying immediately solves
		//		two problems:
		//
		//		1. IE: without the delay, focus work in "open" causes the system
		//		context menu to appear in spite of stopEvent.
		//
		//		2. Avoid double-shows on linux, where shift-F10 generates an oncontextmenu event
		//		even after a event.stop(e).  (Shift-F10 on windows doesn't generate the
		//		oncontextmenu event.)

		if(!this._openTimer){
			this._openTimer = this.defer(function(){
				delete this._openTimer;
				this._openMyself({
					target: target,
					iframe: iframe,
					coords: coords
				});
			}, 1);
		}
	},

	_openMyself: function(args){
		// summary:
		//		Internal function for opening myself when the user does a right-click or something similar.
		// args:
		//		This is an Object containing:
		//
		//		- target: The node that is being clicked
		//		- iframe: If an `<iframe>` is being clicked, iframe points to that iframe
		//		- coords: Put menu at specified x/y position in viewport, or if iframe is
		//		  specified, then relative to iframe.
		//
		//		_openMyself() formerly took the event object, and since various code references
		//		evt.target (after connecting to _openMyself()), using an Object for parameters
		//		(so that old code still works).

		var target = args.target,
			iframe = args.iframe,
			coords = args.coords;

		// To be used by MenuItem event handlers to tell which node the menu was opened on
		this.currentTarget = target;

		// Get coordinates to open menu, either at specified (mouse) position or (if triggered via keyboard)
		// then near the node the menu is assigned to.
		if(coords){
			if(iframe){
				// Specified coordinates are on <body> node of an <iframe>, convert to match main document
				var ifc = domGeometry.position(iframe, true),
					window = this._iframeContentWindow(iframe),
					scroll = domGeometry.docScroll(window.document);

				var cs = domStyle.getComputedStyle(iframe),
					tp = domStyle.toPixelValue,
					left = (has("ie") && has("quirks") ? 0 : tp(iframe, cs.paddingLeft)) + (has("ie") && has("quirks") ? tp(iframe, cs.borderLeftWidth) : 0),
					top = (has("ie") && has("quirks") ? 0 : tp(iframe, cs.paddingTop)) + (has("ie") && has("quirks") ? tp(iframe, cs.borderTopWidth) : 0);

				coords.x += ifc.x + left - scroll.x;
				coords.y += ifc.y + top - scroll.y;
			}
		}else{
			coords = domGeometry.position(target, true);
			coords.x += 10;
			coords.y += 10;
		}

		var self=this;
		var prevFocusNode = this._focusManager.get("prevNode");
		var curFocusNode = this._focusManager.get("curNode");
		var savedFocusNode = !curFocusNode || (dom.isDescendant(curFocusNode, this.domNode)) ? prevFocusNode : curFocusNode;

		function closeAndRestoreFocus(){
			// user has clicked on a menu or popup
			if(self.refocus && savedFocusNode){
				savedFocusNode.focus();
			}
			pm.close(self);
		}
		pm.open({
			popup: this,
			x: coords.x,
			y: coords.y,
			onExecute: closeAndRestoreFocus,
			onCancel: closeAndRestoreFocus,
			orient: this.isLeftToRight() ? 'L' : 'R'
		});
		this.focus();

		this._onBlur = function(){
			this.inherited('_onBlur', arguments);
			// Usually the parent closes the child widget but if this is a context
			// menu then there is no parent
			pm.close(this);
			// don't try to restore focus; user has clicked another part of the screen
			// and set focus there
		};
	},

	destroy: function(){
		array.forEach(this._bindings, function(b){ if(b){ this.unBindDomNode(b.node); } }, this);
		this.inherited(arguments);
	}
});

});
