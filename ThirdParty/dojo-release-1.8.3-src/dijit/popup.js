define([
	"dojo/_base/array", // array.forEach array.some
	"dojo/aspect",
	"dojo/_base/connect",	// connect._keypress
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.isDescendant
	"dojo/dom-attr", // domAttr.set
	"dojo/dom-construct", // domConstruct.create domConstruct.destroy
	"dojo/dom-geometry", // domGeometry.isBodyLtr
	"dojo/dom-style", // domStyle.set
	"dojo/_base/event", // event.stop
	"dojo/keys",
	"dojo/_base/lang", // lang.hitch
	"dojo/on",
	"dojo/sniff", // has("ie") has("mozilla")
	"./place",
	"./BackgroundIframe",
	"./main"	// dijit (defining dijit.popup to match API doc)
], function(array, aspect, connect, declare, dom, domAttr, domConstruct, domGeometry, domStyle, event, keys, lang, on, has,
			place, BackgroundIframe, dijit){

	// module:
	//		dijit/popup

	/*=====
	var __OpenArgs = {
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
		//		When the around parameter is specified, orient should be a list of positions to try, ex:
		//	|	[ "below", "above" ]
		//		For backwards compatibility it can also be an (ordered) hash of tuples of the form
		//		(around-node-corner, popup-node-corner), ex:
		//	|	{ "BL": "TL", "TL": "BL" }
		//		where BL means "bottom left" and "TL" means "top left", etc.
		//
		//		dijit/popup.open() tries to position the popup according to each specified position, in order,
		//		until the popup appears fully within the viewport.
		//
		//		The default value is ["below", "above"]
		//
		//		When an (x,y) position is specified rather than an around node, orient is either
		//		"R" or "L".  R (for right) means that it tries to put the popup to the right of the mouse,
		//		specifically positioning the popup's top-right corner at the mouse position, and if that doesn't
		//		fit in the viewport, then it tries, in order, the bottom-right corner, the top left corner,
		//		and the top-right corner.
		// onCancel: Function
		//		callback when user has canceled the popup by:
		//
		//		1. hitting ESC or
		//		2. by using the popup widget's proprietary cancel mechanism (like a cancel button in a dialog);
		//		   i.e. whenever popupWidget.onCancel() is called, args.onCancel is called
		// onClose: Function
		//		callback whenever this popup is closed
		// onExecute: Function
		//		callback when user "executed" on the popup/sub-popup by selecting a menu choice, etc. (top menu only)
		// padding: place.__Position
		//		adding a buffer around the opening position. This is only useful when around is not set.
	};
	=====*/

	function destroyWrapper(){
		// summary:
		//		Function to destroy wrapper when popup widget is destroyed.
		//		Left in this scope to avoid memory leak on IE8 on refresh page, see #15206.
		if(this._popupWrapper){
			domConstruct.destroy(this._popupWrapper);
			delete this._popupWrapper;
		}
	}

	var PopupManager = declare(null, {
		// summary:
		//		Used to show drop downs (ex: the select list of a ComboBox)
		//		or popups (ex: right-click context menus).

		// _stack: dijit/_WidgetBase[]
		//		Stack of currently popped up widgets.
		//		(someone opened _stack[0], and then it opened _stack[1], etc.)
		_stack: [],

		// _beginZIndex: Number
		//		Z-index of the first popup.   (If first popup opens other
		//		popups they get a higher z-index.)
		_beginZIndex: 1000,

		_idGen: 1,

		_createWrapper: function(/*Widget*/ widget){
			// summary:
			//		Initialization for widgets that will be used as popups.
			//		Puts widget inside a wrapper DIV (if not already in one),
			//		and returns pointer to that wrapper DIV.

			var wrapper = widget._popupWrapper,
				node = widget.domNode;

			if(!wrapper){
				// Create wrapper <div> for when this widget [in the future] will be used as a popup.
				// This is done early because of IE bugs where creating/moving DOM nodes causes focus
				// to go wonky, see tests/robot/Toolbar.html to reproduce
				wrapper = domConstruct.create("div", {
					"class":"dijitPopup",
					style:{ display: "none"},
					role: "presentation"
				}, widget.ownerDocumentBody);
				wrapper.appendChild(node);

				var s = node.style;
				s.display = "";
				s.visibility = "";
				s.position = "";
				s.top = "0px";

				widget._popupWrapper = wrapper;
				aspect.after(widget, "destroy", destroyWrapper, true);
			}

			return wrapper;
		},

		moveOffScreen: function(/*Widget*/ widget){
			// summary:
			//		Moves the popup widget off-screen.
			//		Do not use this method to hide popups when not in use, because
			//		that will create an accessibility issue: the offscreen popup is
			//		still in the tabbing order.

			// Create wrapper if not already there
			var wrapper = this._createWrapper(widget);

			domStyle.set(wrapper, {
				visibility: "hidden",
				top: "-9999px",		// prevent transient scrollbar causing misalign (#5776), and initial flash in upper left (#10111)
				display: ""
			});
		},

		hide: function(/*Widget*/ widget){
			// summary:
			//		Hide this popup widget (until it is ready to be shown).
			//		Initialization for widgets that will be used as popups
			//
			//		Also puts widget inside a wrapper DIV (if not already in one)
			//
			//		If popup widget needs to layout it should
			//		do so when it is made visible, and popup._onShow() is called.

			// Create wrapper if not already there
			var wrapper = this._createWrapper(widget);

			domStyle.set(wrapper, "display", "none");
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

		open: function(/*__OpenArgs*/ args){
			// summary:
			//		Popup the widget at the specified position
			//
			// example:
			//		opening at the mouse position
			//		|		popup.open({popup: menuWidget, x: evt.pageX, y: evt.pageY});
			//
			// example:
			//		opening the widget as a dropdown
			//		|		popup.open({parent: this, popup: menuWidget, around: this.domNode, onClose: function(){...}});
			//
			//		Note that whatever widget called dijit/popup.open() should also listen to its own _onBlur callback
			//		(fired from _base/focus.js) to know that focus has moved somewhere else and thus the popup should be closed.

			var stack = this._stack,
				widget = args.popup,
				orient = args.orient || ["below", "below-alt", "above", "above-alt"],
				ltr = args.parent ? args.parent.isLeftToRight() : domGeometry.isBodyLtr(widget.ownerDocument),
				around = args.around,
				id = (args.around && args.around.id) ? (args.around.id+"_dropdown") : ("popup_"+this._idGen++);

			// If we are opening a new popup that isn't a child of a currently opened popup, then
			// close currently opened popup(s).   This should happen automatically when the old popups
			// gets the _onBlur() event, except that the _onBlur() event isn't reliable on IE, see [22198].
			while(stack.length && (!args.parent || !dom.isDescendant(args.parent.domNode, stack[stack.length-1].widget.domNode))){
				this.close(stack[stack.length-1].widget);
			}

			// Get pointer to popup wrapper, and create wrapper if it doesn't exist
			var wrapper = this._createWrapper(widget);


			domAttr.set(wrapper, {
				id: id,
				style: {
					zIndex: this._beginZIndex + stack.length
				},
				"class": "dijitPopup " + (widget.baseClass || widget["class"] || "").split(" ")[0] +"Popup",
				dijitPopupParent: args.parent ? args.parent.id : ""
			});

			if(has("ie") || has("mozilla")){
				if(!widget.bgIframe){
					// setting widget.bgIframe triggers cleanup in _Widget.destroy()
					widget.bgIframe = new BackgroundIframe(wrapper);
				}
			}

			// position the wrapper node and make it visible
			var best = around ?
				place.around(wrapper, around, orient, ltr, widget.orient ? lang.hitch(widget, "orient") : null) :
				place.at(wrapper, args, orient == 'R' ? ['TR','BR','TL','BL'] : ['TL','BL','TR','BR'], args.padding);

			wrapper.style.display = "";
			wrapper.style.visibility = "visible";
			widget.domNode.style.visibility = "visible";	// counteract effects from _HasDropDown

			var handlers = [];

			// provide default escape and tab key handling
			// (this will work for any widget, not just menu)
			handlers.push(on(wrapper, connect._keypress, lang.hitch(this, function(evt){
				if(evt.charOrCode == keys.ESCAPE && args.onCancel){
					event.stop(evt);
					args.onCancel();
				}else if(evt.charOrCode === keys.TAB){
					event.stop(evt);
					var topPopup = this.getTopPopup();
					if(topPopup && topPopup.onCancel){
						topPopup.onCancel();
					}
				}
			})));

			// watch for cancel/execute events on the popup and notify the caller
			// (for a menu, "execute" means clicking an item)
			if(widget.onCancel && args.onCancel){
				handlers.push(widget.on("cancel", args.onCancel));
			}

			handlers.push(widget.on(widget.onExecute ? "execute" : "change", lang.hitch(this, function(){
				var topPopup = this.getTopPopup();
				if(topPopup && topPopup.onExecute){
					topPopup.onExecute();
				}
			})));

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

		close: function(/*Widget?*/ popup){
			// summary:
			//		Close specified popup and any popups that it parented.
			//		If no popup is specified, closes all popups.

			var stack = this._stack;

			// Basically work backwards from the top of the stack closing popups
			// until we hit the specified popup, but IIRC there was some issue where closing
			// a popup would cause others to close too.  Thus if we are trying to close B in [A,B,C]
			// closing C might close B indirectly and then the while() condition will run where stack==[A]...
			// so the while condition is constructed defensively.
			while((popup && array.some(stack, function(elem){return elem.widget == popup;})) ||
				(!popup && stack.length)){
				var top = stack.pop(),
					widget = top.widget,
					onClose = top.onClose;

				if(widget.onClose){
					// TODO: in 2.0 standardize onHide() (used by StackContainer) and onClose() (used here)
					widget.onClose();
				}

				var h;
				while(h = top.handlers.pop()){ h.remove(); }

				// Hide the widget and it's wrapper unless it has already been destroyed in above onClose() etc.
				if(widget && widget.domNode){
					this.hide(widget);
				}

				if(onClose){
					onClose();
				}
			}
		}
	});

	return (dijit.popup = new PopupManager());
});
