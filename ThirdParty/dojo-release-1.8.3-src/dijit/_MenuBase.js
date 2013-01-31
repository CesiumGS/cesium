define([
	"dojo/_base/array",	// array.indexOf
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.isDescendant domClass.replace
	"dojo/dom-attr",
	"dojo/dom-class", // domClass.replace
	"dojo/_base/lang", // lang.hitch
	"dojo/mouse",	// mouse.enter, mouse.leave
	"dojo/on",
	"dojo/window",
	"./a11yclick",
	"./popup",
	"./registry",
	"./_Widget",
	"./_KeyNavContainer",
	"./_TemplatedMixin"
], function(array, declare, dom, domAttr, domClass, lang, mouse, on, winUtils,
			a11yclick, pm, registry, _Widget, _KeyNavContainer, _TemplatedMixin){


// module:
//		dijit/_MenuBase

return declare("dijit._MenuBase",
	[_Widget, _TemplatedMixin, _KeyNavContainer],
{
	// summary:
	//		Base class for Menu and MenuBar

	// parentMenu: [readonly] Widget
	//		pointer to menu that displayed me
	parentMenu: null,

	// popupDelay: Integer
	//		number of milliseconds before hovering (without clicking) causes the popup to automatically open.
	popupDelay: 500,

	// autoFocus: Boolean
	//		A toggle to control whether or not a Menu gets focused when opened as a drop down from a MenuBar
	//		or DropDownButton/ComboButton.   Note though that it always get focused when opened via the keyboard.
	autoFocus: false,

	childSelector: function(/*DOMNode*/ node){
		// summary:
		//		Selector (passed to on.selector()) used to identify MenuItem child widgets, but exclude inert children
		//		like MenuSeparator.  If subclass overrides to a string (ex: "> *"), the subclass must require dojo/query.
		// tags:
		//		protected

		var widget = registry.byNode(node);
		return node.parentNode == this.containerNode && widget && widget.focus;
	},

	postCreate: function(){
		var self = this,
			matches = typeof this.childSelector == "string" ? this.childSelector : lang.hitch(this, "childSelector");
		this.own(
			on(this.containerNode, on.selector(matches, mouse.enter), function(){
				self.onItemHover(registry.byNode(this));
			}),
			on(this.containerNode, on.selector(matches, mouse.leave), function(){
				self.onItemUnhover(registry.byNode(this));
			}),
			on(this.containerNode, on.selector(matches, a11yclick), function(evt){
				self.onItemClick(registry.byNode(this), evt);
				evt.stopPropagation();
				evt.preventDefault();
			})
		);
		this.inherited(arguments);
	},

	onExecute: function(){
		// summary:
		//		Attach point for notification about when a menu item has been executed.
		//		This is an internal mechanism used for Menus to signal to their parent to
		//		close them, because they are about to execute the onClick handler.  In
		//		general developers should not attach to or override this method.
		// tags:
		//		protected
	},

	onCancel: function(/*Boolean*/ /*===== closeAll =====*/){
		// summary:
		//		Attach point for notification about when the user cancels the current menu
		//		This is an internal mechanism used for Menus to signal to their parent to
		//		close them.  In general developers should not attach to or override this method.
		// tags:
		//		protected
	},

	_moveToPopup: function(/*Event*/ evt){
		// summary:
		//		This handles the right arrow key (left arrow key on RTL systems),
		//		which will either open a submenu, or move to the next item in the
		//		ancestor MenuBar
		// tags:
		//		private

		if(this.focusedChild && this.focusedChild.popup && !this.focusedChild.disabled){
			this.onItemClick(this.focusedChild, evt);
		}else{
			var topMenu = this._getTopMenu();
			if(topMenu && topMenu._isMenuBar){
				topMenu.focusNext();
			}
		}
	},

	_onPopupHover: function(/*Event*/ /*===== evt =====*/){
		// summary:
		//		This handler is called when the mouse moves over the popup.
		// tags:
		//		private

		// if the mouse hovers over a menu popup that is in pending-close state,
		// then stop the close operation.
		// This can't be done in onItemHover since some popup targets don't have MenuItems (e.g. ColorPicker)
		if(this.currentPopup && this.currentPopup._pendingClose_timer){
			var parentMenu = this.currentPopup.parentMenu;
			// highlight the parent menu item pointing to this popup
			if(parentMenu.focusedChild){
				parentMenu.focusedChild._setSelected(false);
			}
			parentMenu.focusedChild = this.currentPopup.from_item;
			parentMenu.focusedChild._setSelected(true);
			// cancel the pending close
			this._stopPendingCloseTimer(this.currentPopup);
		}
	},

	onItemHover: function(/*MenuItem*/ item){
		// summary:
		//		Called when cursor is over a MenuItem.
		// tags:
		//		protected

		// Don't do anything unless user has "activated" the menu by:
		//		1) clicking it
		//		2) opening it from a parent menu (which automatically focuses it)
		if(this.isActive){
			this.focusChild(item);
			if(this.focusedChild.popup && !this.focusedChild.disabled && !this.hover_timer){
				this.hover_timer = this.defer("_openPopup", this.popupDelay);
			}
		}
		// if the user is mixing mouse and keyboard navigation,
		// then the menu may not be active but a menu item has focus,
		// but it's not the item that the mouse just hovered over.
		// To avoid both keyboard and mouse selections, use the latest.
		if(this.focusedChild){
			this.focusChild(item);
		}
		this._hoveredChild = item;

		item._set("hovering", true);
	},

	_onChildBlur: function(item){
		// summary:
		//		Called when a child MenuItem becomes inactive because focus
		//		has been removed from the MenuItem *and* it's descendant menus.
		// tags:
		//		private
		this._stopPopupTimer();
		item._setSelected(false);
		// Close all popups that are open and descendants of this menu
		var itemPopup = item.popup;
		if(itemPopup){
			this._stopPendingCloseTimer(itemPopup);
			itemPopup._pendingClose_timer = this.defer(function(){
				itemPopup._pendingClose_timer = null;
				if(itemPopup.parentMenu){
					itemPopup.parentMenu.currentPopup = null;
				}
				pm.close(itemPopup); // this calls onClose
			}, this.popupDelay);
		}
	},

	onItemUnhover: function(/*MenuItem*/ item){
		// summary:
		//		Callback fires when mouse exits a MenuItem
		// tags:
		//		protected

		if(this.isActive){
			this._stopPopupTimer();
		}
		if(this._hoveredChild == item){ this._hoveredChild = null; }

		item._set("hovering", false);
	},

	_stopPopupTimer: function(){
		// summary:
		//		Cancels the popup timer because the user has stop hovering
		//		on the MenuItem, etc.
		// tags:
		//		private
		if(this.hover_timer){
			this.hover_timer = this.hover_timer.remove();
		}
	},

	_stopPendingCloseTimer: function(/*dijit/_WidgetBase*/ popup){
		// summary:
		//		Cancels the pending-close timer because the close has been preempted
		// tags:
		//		private
		if(popup._pendingClose_timer){
			popup._pendingClose_timer = popup._pendingClose_timer.remove();
		}
	},

	_stopFocusTimer: function(){
		// summary:
		//		Cancels the pending-focus timer because the menu was closed before focus occured
		// tags:
		//		private
		if(this._focus_timer){
			this._focus_timer = this._focus_timer.remove();
		}
	},

	_getTopMenu: function(){
		// summary:
		//		Returns the top menu in this chain of Menus
		// tags:
		//		private
		for(var top=this; top.parentMenu; top=top.parentMenu);
		return top;
	},

	onItemClick: function(/*dijit/_WidgetBase*/ item, /*Event*/ evt){
		// summary:
		//		Handle clicks on an item.
		// tags:
		//		private

		// this can't be done in _onFocus since the _onFocus events occurs asynchronously
		if(typeof this.isShowingNow == 'undefined'){ // non-popup menu
			this._markActive();
		}

		this.focusChild(item);

		if(item.disabled){ return false; }

		if(item.popup){
			this._openPopup(evt.type == "keypress");
		}else{
			// before calling user defined handler, close hierarchy of menus
			// and restore focus to place it was when menu was opened
			this.onExecute();

			// user defined handler for click
			item._onClick ? item._onClick(evt) : item.onClick(evt);
		}
	},

	_openPopup: function(/*Boolean*/ focus){
		// summary:
		//		Open the popup to the side of/underneath the current menu item, and optionally focus first item
		// tags:
		//		protected

		this._stopPopupTimer();
		var from_item = this.focusedChild;
		if(!from_item){ return; } // the focused child lost focus since the timer was started
		var popup = from_item.popup;
		if(!popup.isShowingNow){
			if(this.currentPopup){
				this._stopPendingCloseTimer(this.currentPopup);
				pm.close(this.currentPopup);
			}
			popup.parentMenu = this;
			popup.from_item = from_item; // helps finding the parent item that should be focused for this popup
			var self = this;
			pm.open({
				parent: this,
				popup: popup,
				around: from_item.domNode,
				orient: this._orient || ["after", "before"],
				onCancel: function(){ // called when the child menu is canceled
					// set isActive=false (_closeChild vs _cleanUp) so that subsequent hovering will NOT open child menus
					// which seems aligned with the UX of most applications (e.g. notepad, wordpad, paint shop pro)
					self.focusChild(from_item);	// put focus back on my node
					self._cleanUp();			// close the submenu (be sure this is done _after_ focus is moved)
					from_item._setSelected(true); // oops, _cleanUp() deselected the item
					self.focusedChild = from_item;	// and unset focusedChild
				},
				onExecute: lang.hitch(this, "_cleanUp")
			});

			this.currentPopup = popup;
			// detect mouseovers to handle lazy mouse movements that temporarily focus other menu items
			popup.connect(popup.domNode, "onmouseenter", lang.hitch(self, "_onPopupHover")); // cleaned up when the popped-up widget is destroyed on close
		}

		if(focus && popup.focus){
			// If user is opening the popup via keyboard (right arrow, or down arrow for MenuBar), then focus the popup.
			// If the cursor happens to collide with the popup, it will generate an onmouseover event
			// even though the mouse wasn't moved.  Use defer() to call popup.focus so that
			// our focus() call overrides the onmouseover event, rather than vice-versa.  (#8742)
			popup._focus_timer = this.defer(lang.hitch(popup, function(){
				this._focus_timer = null;
				this.focus();
			}));
		}
	},

	_markActive: function(){
		// summary:
		//		Mark this menu's state as active.
		//		Called when this Menu gets focus from:
		//
		//		1. clicking it (mouse or via space/arrow key)
		//		2. being opened by a parent menu.
		//
		//		This is not called just from mouse hover.
		//		Focusing a menu via TAB does NOT automatically set isActive
		//		since TAB is a navigation operation and not a selection one.
		//		For Windows apps, pressing the ALT key focuses the menubar
		//		menus (similar to TAB navigation) but the menu is not active
		//		(ie no dropdown) until an item is clicked.
		this.isActive = true;
		domClass.replace(this.domNode, "dijitMenuActive", "dijitMenuPassive");
	},

	onOpen: function(/*Event*/ /*===== e =====*/){
		// summary:
		//		Callback when this menu is opened.
		//		This is called by the popup manager as notification that the menu
		//		was opened.
		// tags:
		//		private

		this.isShowingNow = true;
		this._markActive();
	},

	_markInactive: function(){
		// summary:
		//		Mark this menu's state as inactive.
		this.isActive = false; // don't do this in _onBlur since the state is pending-close until we get here
		domClass.replace(this.domNode, "dijitMenuPassive", "dijitMenuActive");
	},

	onClose: function(){
		// summary:
		//		Callback when this menu is closed.
		//		This is called by the popup manager as notification that the menu
		//		was closed.
		// tags:
		//		private

		this._stopFocusTimer();
		this._markInactive();
		this.isShowingNow = false;
		this.parentMenu = null;
	},

	_closeChild: function(){
		// summary:
		//		Called when submenu is clicked or focus is lost.  Close hierarchy of menus.
		// tags:
		//		private
		this._stopPopupTimer();

		if(this.currentPopup){
			// If focus is on a descendant MenuItem then move focus to me,
			// because IE doesn't like it when you display:none a node with focus,
			// and also so keyboard users don't lose control.
			// Likely, immediately after a user defined onClick handler will move focus somewhere
			// else, like a Dialog.
			if(array.indexOf(this._focusManager.activeStack, this.id) >= 0){
				domAttr.set(this.focusedChild.focusNode, "tabIndex", this.tabIndex);
				this.focusedChild.focusNode.focus();
			}
			// Close all popups that are open and descendants of this menu
			pm.close(this.currentPopup);
			this.currentPopup = null;
		}

		if(this.focusedChild){ // unhighlight the focused item
			this.focusedChild._setSelected(false);
			this.onItemUnhover(this.focusedChild);
			this.focusedChild = null;
		}
	},

	_onItemFocus: function(/*MenuItem*/ item){
		// summary:
		//		Called when child of this Menu gets focus from:
		//
		//		1. clicking it
		//		2. tabbing into it
		//		3. being opened by a parent menu.
		//
		//		This is not called just from mouse hover.
		if(this._hoveredChild && this._hoveredChild != item){
			this.onItemUnhover(this._hoveredChild);	// any previous mouse movement is trumped by focus selection
		}
	},

	_onBlur: function(){
		// summary:
		//		Called when focus is moved away from this Menu and it's submenus.
		// tags:
		//		protected
		this._cleanUp();
		this.inherited(arguments);
	},

	_cleanUp: function(){
		// summary:
		//		Called when the user is done with this menu.  Closes hierarchy of menus.
		// tags:
		//		private

		this._closeChild(); // don't call this.onClose since that's incorrect for MenuBar's that never close
		if(typeof this.isShowingNow == 'undefined'){ // non-popup menu doesn't call onClose
			this._markInactive();
		}
	}
});

});
