define(["dojo/_base/declare", "./Default"], 
  function(declare, Default){

	return declare("dojox.charting.plot2d.Areas", Default, {
		// summary:
		//		Represents an area chart.  See dojox/charting/plot2d/Default for details.
		constructor: function(){
			// summary:
			//		The constructor for an Area chart.
			this.opt.lines = true;
			this.opt.areas = true;
		}
	});
});
