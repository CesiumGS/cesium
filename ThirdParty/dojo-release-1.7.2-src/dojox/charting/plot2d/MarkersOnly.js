define(["dojo/_base/declare", "./Default"], function(declare, Default){
/*=====
var Default = dojox.charting.plot2d.Default;
=====*/
	return declare("dojox.charting.plot2d.MarkersOnly", Default, {
		//	summary:
		//		A convenience object to draw only markers (like a scatter but not quite).
		constructor: function(){
			//	summary:
			//		Set up our default plot to only have markers and no lines.
			this.opt.lines   = false;
			this.opt.markers = true;
		}
	});
});
