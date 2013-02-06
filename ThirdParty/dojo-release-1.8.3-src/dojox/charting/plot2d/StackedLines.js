define(["dojo/_base/declare", "./Stacked"], function(declare, Stacked){

	return declare("dojox.charting.plot2d.StackedLines", Stacked, {
		// summary:
		//		A convenience object to create a stacked line chart.
		constructor: function(){
			// summary:
			//		Force our Stacked base to be lines only.
			this.opt.lines = true;
		}
	});
});
