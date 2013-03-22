define([
	"dojo/_base/declare",
	"./_CalendarBase",
	"./_CalendarMonthYear"
], function(declare, _CalendarBase, _CalendarMonthYear){
	return declare("dojox.widget.MonthAndYearlyCalendar", [_CalendarBase, _CalendarMonthYear], {
		// summary:
		//		A calendar with only a daily view.
	});
});
