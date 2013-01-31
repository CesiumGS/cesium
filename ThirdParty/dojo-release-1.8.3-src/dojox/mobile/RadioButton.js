define([
	"dojo/_base/declare",
	"dijit/form/_RadioButtonMixin",
	"./CheckBox"
], function(declare, RadioButtonMixin, CheckBox){

	return declare("dojox.mobile.RadioButton", [CheckBox, RadioButtonMixin], {
		// summary:
		//		A non-templated radio button widget that can be in two states (checked or not checked).

		// _setTypeAttr: [private] Function 
		//		Overrides the automatic assignment of type to nodes, because it causes
		//		exception on IE. Instead, the type must be specified as this.type
		//		when the node is created, as part of the original DOM.
		_setTypeAttr: null,

		// baseClass: String
		//		The name of the CSS class of this widget.
		baseClass: "mblRadioButton"
	});
});
