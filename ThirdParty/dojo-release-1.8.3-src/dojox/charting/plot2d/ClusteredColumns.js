define(["dojo/_base/declare", "./Columns", "./common"], 
	function(declare, Columns, dc){

	return declare("dojox.charting.plot2d.ClusteredColumns", Columns, {
		// summary:
		//		A plot representing grouped or clustered columns (vertical bars)
		getBarProperties: function(){
			var f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt, this.series.length);
			return {gap: f.gap, width: f.size, thickness: f.size};
		}
	});
});
