define([
	"dojo/_base/lang",
	"./_PickerChooser!DatePicker"
], function(lang, DatePicker){

	// module:
	//		dojox/mobile/DatePicker

	// TODO: need to list all the properties/methods in the interface provided by
	// SpinWheelDatePicker / ValuePickerDatePicker
		
	/*=====
	return function(){
		// summary:
		//		A wrapper widget around SpinWheelDatePicker or ValuePickerDatePicker.
		//		Returns ValuePickerDatePicker when the current theme is "android".
		//		Returns SpinWheelDatePicker otherwise.
	};
	=====*/
	return lang.setObject("dojox.mobile.DatePicker", DatePicker);
});
