define([
	"dojo/_base/declare",
	"dojo/dom-class",
	"dijit/form/_ToggleButtonMixin",
	"./Button"
], function(declare, domClass, ToggleButtonMixin, Button){

	return declare("dojox.mobile.ToggleButton", [Button, ToggleButtonMixin], {
		// summary:
		//		A non-templated button widget that can be in two states (checked or not).
		//		Can be base class for things like tabs or checkbox or radio buttons

		baseClass: "mblToggleButton",

		_setCheckedAttr: function(){
			this.inherited(arguments);
			var newStateClasses = (this.baseClass+' '+this["class"]).replace(/(\S+)\s*/g, "$1Checked ").split(" ");
			domClass[this.checked ? "add" : "remove"](this.focusNode || this.domNode, newStateClasses);
		}
	});
});
