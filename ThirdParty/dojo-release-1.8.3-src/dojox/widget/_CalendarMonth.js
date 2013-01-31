define([
	"dojo/_base/declare",
	"./_CalendarMonthView"
], function(declare, _CalendarMonthView){
	return declare("dojox.widget._CalendarMonth", null, {
		// summary:
		//		Mixin class for adding a view listing all 12 months of the year to the
		//		dojox/widget/_CalendarBase

		constructor: function(){
			// summary:
			//		Adds a dojox/widget/_CalendarMonthView view to the calendar widget.
			this._addView(_CalendarMonthView);
		}
	});
});
