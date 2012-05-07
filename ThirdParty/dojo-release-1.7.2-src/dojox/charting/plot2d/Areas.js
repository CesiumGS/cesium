define(["dojo/_base/declare", "./Default"], 
  function(declare, Default){
/*=====
var Default = dojox.charting.plot2d.Default;
=====*/
	return declare("dojox.charting.plot2d.Areas", Default, {
		//	summary:
		//		Represents an area chart.  See dojox.charting.plot2d.Default for details.
		constructor: function(){
			this.opt.lines = true;
			this.opt.areas = true;
		}
	});
});
