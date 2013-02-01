define(["dojo/_base/declare", "./Stacked"], function(declare, Stacked){

	return declare("dojox.charting.plot2d.StackedAreas", Stacked, {
		// summary:
		//		A convenience object to set up a stacked area plot.
		constructor: function(){
			// summary:
			//		Force our Stacked plotter to include both lines and areas.
			this.opt.lines = true;
			this.opt.areas = true;
		}
	});
});

