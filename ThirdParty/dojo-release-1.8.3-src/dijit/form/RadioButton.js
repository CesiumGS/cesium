define([
	"dojo/_base/declare", // declare
	"./CheckBox",
	"./_RadioButtonMixin"
], function(declare, CheckBox, _RadioButtonMixin){

	// module:
	//		dijit/form/RadioButton

	return declare("dijit.form.RadioButton", [CheckBox, _RadioButtonMixin], {
		// summary:
		//		Same as an HTML radio, but with fancy styling.

		baseClass: "dijitRadio"
	});
});
