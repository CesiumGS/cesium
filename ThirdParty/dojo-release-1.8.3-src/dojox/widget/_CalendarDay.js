define([
	"dojo/_base/declare",
	"./_CalendarDayView"
], function(declare, _CalendarDayView){
	return declare("dojox.widget._CalendarDay", null, {
		// summary:
		//		Mixin for the dojox.widget.Calendar which provides
		//		the standard day-view. A single month is shown at a time.
		parent: null,

		constructor: function(){
			this._addView(_CalendarDayView);
		}
	});
});
