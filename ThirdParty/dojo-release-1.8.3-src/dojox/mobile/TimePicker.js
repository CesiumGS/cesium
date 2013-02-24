define([
	"dojo/_base/lang",
	"./_PickerChooser!TimePicker"
], function(lang, TimePicker){

	/*=====
	return function(){
		// module:
		//		dojox/mobile/TimePicker
		// summary:
		//		A wrapper widget around SpinWheelTimePicker or ValuePickerTimePicker.
		//		Returns ValuePickerTimePicker when the current theme is "android".
		//		Returns SpinWheelTimePicker otherwise.

		 // TODO: need to list all the properties/methods in the interface provided by
		 // SpinWheelTimePicker / ValuePickerTimePicker
	 };
	=====*/

	return lang.setObject("dojox.mobile.TimePicker", TimePicker);
});
