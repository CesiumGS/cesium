define([
	"require",
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.byId dom.isDescendant
	"dojo/dom-attr", // domAttr.get domAttr.set domAttr.has domAttr.remove
	"dojo/dom-geometry", // domStyle.getComputedStyle domGeometry.position
	"dojo/dom-style", // domStyle.getComputedStyle
	"dojo/keys", // keys.F10
	"dojo/_base/lang", // lang.hitch
	"dojo/on",
	"dojo/sniff", // has("ie"), has("quirks")
	"dojo/_base/window", // win.body
	"dojo/window", // winUtils.get
	"./popup",
	"./DropDownMenu",
	"dojo/ready"
], function(require, array, declare, dom, domAttr, domGeometry, domStyle, keys, lang, on, has, win, winUtils, pm, DropDownMenu, ready){

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
		//		the nodes specified by targetNodeIds themselves.  Useful for applying a Menu to
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
		// TODO: remove in 2.0, we have better ways of opening a menu with a left click, by extending _HasDropDown.

		// refocus: Boolean
		//		When this menu closes, re-focus the element which had focus before it was opened.
		refocus: true,

		postCreate: function(){
			if(this.contextMenuForWindow){
				this.bindDomNode(this.ownerDocumentBody);
			}else{
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
				(iframe_el.name && document.frames[iframe_el.name]) || null;	//	Window
		},

		_iframeContentDocument: function(/* HTMLIFrameElement */iframe_el){
			// summary:
			//		Returns a reference to the document object inside iframe_el
			// tags:
			//		protected
			return iframe_el.contentDocument // W3
				|| (iframe_el.contentWindow && iframe_el.contentWindow.document) // IE
				|| (iframe_el.name && document.frames[iframe_el.name] && document.frames[iframe_el.name].document)
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
						function(eventType){
							return on.selector(selector, eventType);
						} :
						function(eventType){
							return eventType;
						},
					self = this;
				return [
					on(cn, delegatedEvent(this.leftClickToOpen ? "click" : "contextmenu"), function(evt){
						evt.stopPropagation();
						evt.preventDefault();

						if((new Date()).getTime() < this._lastKeyDown + 500){
							// Ignore contextmenu/click events that were already processed in keydown handler below.
							// But still call preventDefault() (above) so system context menu doesn't appear.
							return;
						}

						// Schedule context menu to be opened.
						// Note that this won't work will if the click was generated by the keyboard, while
						// focused on a <button> etc.   In that case evt.pageX and evt.pageY are either (0,0) or
						// wherever the mouse cursor is.  See keydown handler below.
						self._scheduleOpen(this, iframe, {x: evt.pageX, y: evt.pageY}, evt.target);
					}),
					on(cn, delegatedEvent("keydown"), function(evt){
						if(evt.keyCode == 93 ||									// context menu key
							(evt.shiftKey && evt.keyCode == keys.F10) ||		// shift-F10
							(this.leftClickToOpen && evt.keyCode == keys.SPACE)	// space key
						){
							evt.stopPropagation();
							evt.preventDefault();

							// Open the menu around evt.target.  Note that "this" and evt.target
							// are likely different, especially for global context menu, where "this" is <body>.
							self._scheduleOpen(this, iframe, null, evt.target);	// no coords - open near evt.target

							this._lastKeyDown = (new Date()).getTime();
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

					var window = this._iframeContentWindow(iframe),
						cn = win.body(window.document);
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
				var bid = domAttr.get(node, attrName) - 1, b = this._bindings[bid], h;
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

		_scheduleOpen: function(delegatedTarget, iframe, coords, target){
			// summary:
			//		Set timer to display myself.  Using a timer rather than displaying immediately solves
			//		IE problem: without the delay, focus work in "open" causes the system
			//		context menu to appear in spite of evt.preventDefault().
			// delegatedTarget: Element
			//		The node specified in targetNodeIds or matching selector that the menu is being opened for.
			// iframe: HTMLIframeElement?
			//		Set if target is inside the specified iframe.
			// coords: Object
			//		x/y position to center the menu around.  Undefined if menu was opened via keyboard.
			// target: Element
			//		The actual clicked node, either delegatedTarget or a descendant.

			if(!this._openTimer){
				this._openTimer = this.defer(function(){
					delete this._openTimer;
					this._openMyself({
						target: target,
						delegatedTarget: delegatedTarget,
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
			//		- target: The node that is being clicked.
			//		- delegatedTarget: The node from this.targetNodeIds or matching this.selector,
			//		  either the same as target or an ancestor of target.
			//		- iframe: If an `<iframe>` is being clicked, iframe points to that iframe
			//		- coords: Mouse cursor x/y coordinates.  Null when opened via keyboard.
			//		  Put menu at specified position in iframe (if iframe specified) or otherwise in viewport.
			//
			//		_openMyself() formerly took the event object, and since various code references
			//		evt.target (after connecting to _openMyself()), using an Object for parameters
			//		(so that old code still works).

			var target = args.target,
				iframe = args.iframe,
				coords = args.coords,
				byKeyboard = !coords;

			// To be used by MenuItem event handlers to tell which node the menu was opened on
			this.currentTarget = args.delegatedTarget;

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

			var self = this;
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

			// Focus the menu even when opened by mouse, so that a click on blank area of screen will close it
			this.focus();
			if(!byKeyboard){
				// But then (when opened by mouse), mark Menu as passive, so that the first item isn't highlighted.
				// On IE9+ this needs to be on a delay because the focus is asynchronous.
				this.defer(function(){
					this._cleanUp(true);
				});
			}

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
			array.forEach(this._bindings, function(b){
				if(b){
					this.unBindDomNode(b.node);
				}
			}, this);
			this.inherited(arguments);
		}
	});
});
