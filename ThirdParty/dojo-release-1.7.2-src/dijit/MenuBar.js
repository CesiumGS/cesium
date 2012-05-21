define([
	"dojo/_base/declare", // declare
	"dojo/_base/event", // event.stop
	"dojo/keys", // keys.DOWN_ARROW
	"./_MenuBase",
	"dojo/text!./templates/MenuBar.html"
], function(declare, event, keys, _MenuBase, template){

/*=====
	var _MenuBase = dijit._MenuBase;
=====*/

// module:
//		dijit/MenuBar
// summary:
//		A menu bar, listing menu choices horizontally, like the "File" menu in most desktop applications

return declare("dijit.MenuBar", _MenuBase, {
	// summary:
	//		A menu bar, listing menu choices horizontally, like the "File" menu in most desktop applications

	templateString: template,

	baseClass: "dijitMenuBar",

	// _isMenuBar: [protected] Boolean
	//		This is a MenuBar widget, not a (vertical) Menu widget.
	_isMenuBar: true,

	postCreate: function(){
		var l = this.isLeftToRight();
		this.connectKeyNavHandlers(
			l ? [keys.LEFT_ARROW] : [keys.RIGHT_ARROW],
			l ? [keys.RIGHT_ARROW] : [keys.LEFT_ARROW]
		);

		// parameter to dijit.popup.open() about where to put popup (relative to this.domNode)
		this._orient = ["below"];
	},

	focusChild: function(item){
		// overload focusChild so that whenever the focus is moved to a new item,
		// check the previous focused whether it has its popup open, if so, after
		// focusing the new item, open its submenu immediately
		var prev_item = this.focusedChild,
			showpopup = prev_item && prev_item.popup && prev_item.popup.isShowingNow;
		this.inherited(arguments);
		if(showpopup && item.popup && !item.disabled){
			this._openPopup();		// TODO: on down arrow, _openPopup() is called here and in onItemClick()
		}
	},

	_onKeyPress: function(/*Event*/ evt){
		// summary:
		//		Handle keyboard based menu navigation.
		// tags:
		//		protected

		if(evt.ctrlKey || evt.altKey){ return; }

		switch(evt.charOrCode){
			case keys.DOWN_ARROW:
				this._moveToPopup(evt);
				event.stop(evt);
		}
	},

	onItemClick: function(/*dijit._Widget*/ item, /*Event*/ evt){
		// summary:
		//		Handle clicks on an item. Cancels a dropdown if already open.
		// tags:
		//		private
		if(item.popup && item.popup.isShowingNow){
			item.popup.onCancel();
		}else{
			this.inherited(arguments);
		}
	}
});

});
