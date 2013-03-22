define(["dojo/_base/declare", "./Default"], function(declare, Default){

	return declare("dojox.charting.plot2d.Markers", Default, {
		// summary:
		//		A convenience plot to draw a line chart with markers.
		constructor: function(){
			// summary:
			//		Set up the plot for lines and markers.
			this.opt.markers = true;
		}
	});
});
