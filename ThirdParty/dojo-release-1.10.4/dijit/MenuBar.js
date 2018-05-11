define([
	"dojo/_base/declare", // declare
	"dojo/keys", // keys.DOWN_ARROW
	"./_MenuBase",
	"dojo/text!./templates/MenuBar.html"
], function(declare, keys, _MenuBase, template){

	// module:
	//		dijit/MenuBar

	return declare("dijit.MenuBar", _MenuBase, {
		// summary:
		//		A menu bar, listing menu choices horizontally, like the "File" menu in most desktop applications

		templateString: template,

		baseClass: "dijitMenuBar",

		// By default open popups for MenuBar instantly
		popupDelay: 0,

		// _isMenuBar: [protected] Boolean
		//		This is a MenuBar widget, not a (vertical) Menu widget.
		_isMenuBar: true,

		// parameter to dijit.popup.open() about where to put popup (relative to this.domNode)
		_orient: ["below"],

		_moveToPopup: function(/*Event*/ evt){
			// summary:
			//		This handles the down arrow key, opening a submenu if one exists.
			//		Unlike _MenuBase._moveToPopup(), will never move to the next item in the MenuBar.
			// tags:
			//		private

			if(this.focusedChild && this.focusedChild.popup && !this.focusedChild.disabled){
				this.onItemClick(this.focusedChild, evt);
			}
		},

		focusChild: function(item){
			// Overload focusChild so that whenever a new item is focused and the menu is active, open its submenu immediately.

			this.inherited(arguments);
			if(this.activated && item.popup && !item.disabled){
				this._openItemPopup(item, true);
			}
		},

		_onChildDeselect: function(item){
			// override _MenuBase._onChildDeselect() to close submenu immediately

			if(this.currentPopupItem == item){
				this.currentPopupItem = null;
				item._closePopup(); // this calls onClose
			}

			this.inherited(arguments);
		},

		// Arrow key navigation
		_onLeftArrow: function(){
			this.focusPrev();
		},
		_onRightArrow: function(){
			this.focusNext();
		},
		_onDownArrow: function(/*Event*/ evt){
			this._moveToPopup(evt);
		},
		_onUpArrow: function(){
		},

		onItemClick: function(/*dijit/_WidgetBase*/ item, /*Event*/ evt){
			// summary:
			//		Handle clicks on an item.   Also called by _moveToPopup() due to a down-arrow key on the item.
			//		Cancels a dropdown if already open and click is either mouse or space/enter.
			//		Don't close dropdown due to down arrow.
			// tags:
			//		private
			if(item.popup && item.popup.isShowingNow && (!/^key/.test(evt.type) || evt.keyCode !== keys.DOWN_ARROW)){
				item.focusNode.focus();
				this._cleanUp(true);
			}else{
				this.inherited(arguments);
			}
		}
	});
});
