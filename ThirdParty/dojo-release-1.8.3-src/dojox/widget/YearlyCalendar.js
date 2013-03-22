define([
	"dojo/_base/declare",
	"./_CalendarBase",
	"./_CalendarYear"
], function(declare, _CalendarBase, _CalendarYear){
	return declare("dojox.widget.YearlyCalendar", [_CalendarBase, _CalendarYear], {
		// summary:
		//		A calendar with only a year view.
		_makeDate: function(value){
			var now = new Date();
			now.setFullYear(value);
			return now;
		}
	});
});
