define([
	"dojo/_base/declare",
	"./_CalendarBase",
	"./_CalendarDay",
	"./_CalendarMonth",
	"./_CalendarYear"
	], function(declare, _CalendarBase, _CalendarDay, _CalendarMonth, _CalendarYear){
		return declare("dojox.widget.Calendar3Pane", [_CalendarBase, _CalendarDay, _CalendarMonth, _CalendarYear], {
			// summary:
			//		A Calendar with three panes, includes day, month, and year views
	});
});