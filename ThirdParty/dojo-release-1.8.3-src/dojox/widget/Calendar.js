define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"./_CalendarBase",
	"./_CalendarDay",
	"./_CalendarMonthYear"
], function(kernel, declare, _CalendarBase, _CalendarDay, _CalendarMonthYear){
	kernel.experimental("dojox/widget/Calendar");

	return declare("dojox.widget.Calendar", [_CalendarBase, _CalendarDay, _CalendarMonthYear], {
		// summary:
		//		The standard Calendar. It includes day and month/year views.
		//		No visual effects are included.
	});
});