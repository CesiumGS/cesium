define([
	"dojo/_base/declare",
	"./Calendar",
	"./_FisheyeFX"
], function(declare, Calendar, _FisheyeFX) {
	return declare("dojox.widget.CalendarFisheye", [ Calendar, _FisheyeFX ], {
		// summary:
		//		The standard Calendar. It includes day, month and year views.
		//		FisheyeLite effects are included.
	});
});
