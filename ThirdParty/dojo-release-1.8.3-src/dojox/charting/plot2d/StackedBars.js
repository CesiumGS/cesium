define(["dojo/_base/declare", "./Bars", "./commonStacked"], 
	function(declare, Bars, commonStacked){

	return declare("dojox.charting.plot2d.StackedBars", Bars, {
		// summary:
		//		The plot object representing a stacked bar chart (horizontal bars).
		getSeriesStats: function(){
			// summary:
			//		Calculate the min/max on all attached series in both directions.
			// returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = commonStacked.collectStats(this.series), t;
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			t = stats.hmin, stats.hmin = stats.vmin, stats.vmin = t;
			t = stats.hmax, stats.hmax = stats.vmax, stats.vmax = t;
			return stats; // Object
		},
		getValue: function(value, index, seriesIndex, indexed){
			var y,x;
			if(indexed){
				x = index;
				y = commonStacked.getIndexValue(this.series, seriesIndex, x);
			}else{
				x = value.x - 1;
				y = commonStacked.getValue(this.series, seriesIndex, value.x);
				y = y ? y.y: null;
			}
			return {y:y, x:x};
		}
	});
});
