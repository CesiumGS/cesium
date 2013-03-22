define([
	"dojo/_base/declare",
	"./_PickerBase",
	"./ValuePickerSlot" // to load ValuePickerSlot for you (no direct references)
], function(declare, PickerBase){

	// module:
	//		dojox/mobile/ValuePicker

	return declare("dojox.mobile.ValuePicker", PickerBase, {
		// summary:
		//		A value picker that has stepper.
		// description:
		//		ValuePicker is a widget for selecting some values. The values
		//		can be selected by the Plus button, the Minus button, or the
		//		input field.

		/* internal properties */	
		baseClass: "mblValuePicker",

		onValueChanged: function(/*dojox/mobile/ValuePickerSlot*/slot){
			// summary:
			//		Callback when the slot value is changed.
			// slot:
			//		The slot widget whose value has been changed.
			// tags:
			//		callback
		}
	});
});
