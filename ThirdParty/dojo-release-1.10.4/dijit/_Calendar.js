define([
	"dojo/_base/kernel", // kernel.deprecated
	"./Calendar",
	"./main"	// for exporting dijit.Calendar
], function(kernel, Calendar, dijit){

	// module:
	//		dijit/_Calendar

	/*=====
	return {
		// summary:
		//		Deprecated widget, used dijit/Calendar instead.   Will be removed in 2.0.
	};
	=====*/

	kernel.deprecated("dijit._Calendar is deprecated", "dijit._Calendar moved to dijit.Calendar", 2.0);

	// dijit._Calendar had an underscore all this time merely because it did
	// not satisfy dijit's a11y policy.
	dijit._Calendar = Calendar;
});
