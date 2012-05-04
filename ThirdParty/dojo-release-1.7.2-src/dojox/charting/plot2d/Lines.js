define(["dojo/_base/declare", "./Default"], function(declare, Default){
/*=====
var Default = dojox.charting.plot2d.Default;
=====*/
	return declare("dojox.charting.plot2d.Lines", Default, {
		//	summary:
		//		A convenience constructor to create a typical line chart.
		constructor: function(){
			//	summary:
			//		Preset our default plot to be line-based.
			this.opt.lines = true;
		}
	});
});
