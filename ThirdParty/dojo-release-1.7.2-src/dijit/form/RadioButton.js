define([
	"dojo/_base/declare", // declare
	"./CheckBox",
	"./_RadioButtonMixin"
], function(declare, CheckBox, _RadioButtonMixin){

/*=====
	var CheckBox = dijit.form.CheckBox;
	var _RadioButtonMixin = dijit.form._RadioButtonMixin;
=====*/

	// module:
	//		dijit/form/RadioButton
	// summary:
	//		Radio button widget

	return declare("dijit.form.RadioButton", [CheckBox, _RadioButtonMixin], {
		// summary:
		// 		Same as an HTML radio, but with fancy styling.

		baseClass: "dijitRadio"
	});
});
