define(["dojo/_base/declare", "./Bars", "./common"], 
	function(declare, Bars, dc){

	return declare("dojox.charting.plot2d.ClusteredBars", Bars, {
		// summary:
		//		A plot representing grouped or clustered bars (horizontal bars)
		getBarProperties: function(){
			var f = dc.calculateBarSize(this._vScaler.bounds.scale, this.opt, this.series.length);
			return {gap: f.gap, height: f.size, thickness: f.size};
		}
	});
});
