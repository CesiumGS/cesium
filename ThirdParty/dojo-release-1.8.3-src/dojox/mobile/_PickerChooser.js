define([
	"dojo/_base/lang",
	"dojo/_base/window"
], function(lang, win){

	// module:
	//		dojox/mobile/_PickerChooser

	return{
		// summary:
		//		This widget chooses a picker class according to the current theme.
		//		Imports ValuePicker-based date/time picker when the current theme is "android".
		//		Imports SpinWheel-based date/time picker otherwise.

		load: function (id, parentRequire, loaded){
			// summary:
			//		Imports a picker class according to the current theme.
			var dm = win.global._no_dojo_dm || lang.getObject("dojox.mobile", true);
			parentRequire([(dm.currentTheme === "android" ? "./ValuePicker" : "./SpinWheel") + id], loaded);
		}
	};
});
