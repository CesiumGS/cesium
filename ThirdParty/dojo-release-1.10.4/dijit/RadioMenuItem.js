define([
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.toggle
	"dojo/query!css2", // query
	"./CheckedMenuItem",
	"./registry"    // registry.getEnclosingWidget
], function(array, declare, domClass, query, CheckedMenuItem, registry){

	// module:
	//		dijit/RadioButtonMenuItem

	return declare("dijit.RadioButtonMenuItem", CheckedMenuItem, {
		// summary:
		//		A radio-button-like menu item for toggling on and off

		// Use both base classes so we get styles like dijitMenuItemDisabled
		baseClass: "dijitMenuItem dijitRadioMenuItem",

		role: "menuitemradio",

		// checkedChar: String
		//		Character (or string) used in place of radio button icon when display in high contrast mode
		checkedChar: "*",

		// group: String
		//		Toggling on a RadioMenuItem in a given group toggles off the other RadioMenuItems in that group.
		group: "",
		_setGroupAttr: "domNode",	// needs to be set as an attribute so dojo/query can find it

		_setCheckedAttr: function(/*Boolean*/ checked){
			// If I am being checked then have to deselect currently checked items
			this.inherited(arguments);
			if(!this._created){
				return;
			}
			if(checked && this.group){
				array.forEach(this._getRelatedWidgets(), function(widget){
					if(widget != this && widget.checked){
						widget.set('checked', false);
					}
				}, this);
			}
		},

		_onClick: function(evt){
			// summary:
			//		Clicking this item toggles it on.   If it's already on, then clicking does nothing.
			// tags:
			//		private

			if(!this.disabled && !this.checked){
				this.set("checked", true);
				this.onChange(true);
			}
			this.onClick(evt);
		},

		_getRelatedWidgets: function(){
			// Private function needed to help iterate over all radio menu items in a group.
			var ary = [];
			query("[group=" + this.group + "][role=" + this.role + "]").forEach(
				function(menuItemNode){
					var widget = registry.getEnclosingWidget(menuItemNode);
					if(widget){
						ary.push(widget);
					}
				}
			);
			return ary;
		}
	});
});
