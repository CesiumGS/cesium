define([
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.toggle
	"./MenuItem",
	"dojo/text!./templates/CheckedMenuItem.html",
	"./hccss"
], function(declare, domClass, MenuItem, template){

	// module:
	//		dijit/CheckedMenuItem

	return declare("dijit.CheckedMenuItem", MenuItem, {
		// summary:
		//		A checkbox-like menu item for toggling on and off

		// Use both base classes so we get styles like dijitMenuItemDisabled
		baseClass: "dijitMenuItem dijitCheckedMenuItem",

		templateString: template,

		// checked: Boolean
		//		Our checked state
		checked: false,
		_setCheckedAttr: function(/*Boolean*/ checked){
			this.domNode.setAttribute("aria-checked", checked ? "true" : "false");
			this._set("checked", checked);	// triggers CSS update via _CssStateMixin
		},

		iconClass: "",	// override dijitNoIcon

		role: "menuitemcheckbox",

		// checkedChar: String
		//		Character (or string) used in place of checkbox icon when display in high contrast mode
		checkedChar: "&#10003;",

		onChange: function(/*Boolean*/ /*===== checked =====*/){
			// summary:
			//		User defined function to handle check/uncheck events
			// tags:
			//		callback
		},

		_onClick: function(evt){
			// summary:
			//		Clicking this item just toggles its state
			// tags:
			//		private
			if(!this.disabled){
				this.set("checked", !this.checked);
				this.onChange(this.checked);
			}
			this.onClick(evt);
		}
	});
});
