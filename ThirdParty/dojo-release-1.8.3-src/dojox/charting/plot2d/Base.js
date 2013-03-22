define(["dojo/_base/declare",
		"../Element", "dojo/_base/array",
	    "./common"],
	function(declare, Element, arr,  common){
/*=====
dojox.charting.plot2d.__PlotCtorArgs = {
	// summary:
	//		The base keyword arguments object for plot constructors.
	//		Note that the parameters for this may change based on the
	//		specific plot type (see the corresponding plot type for
	//		details).
};
=====*/
return declare("dojox.charting.plot2d.Base", Element, {
	// summary:
	//		Base class for all plot types.
	constructor: function(chart, kwArgs){
		// summary:
		//		Create a base plot for charting.
		// chart: dojox/chart/Chart
		//		The chart this plot belongs to.
		// kwArgs: dojox.charting.plot2d.__PlotCtorArgs?
		//		An optional arguments object to help define the plot.
	},
	clear: function(){
		// summary:
		//		Clear out all of the information tied to this plot.
		// returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		this.series = [];
		this.dirty = true;
		return this;	//	dojox/charting/plot2d/Base
	},
	setAxis: function(axis){
		// summary:
		//		Set an axis for this plot.
		// axis: dojox.charting.axis2d.Base
		//		The axis to set.
		// returns: dojox/charting/plot2d/Base
		//		A reference to this plot for functional chaining.
		return this;	//	dojox/charting/plot2d/Base
	},
	assignAxes: function(axes){
		// summary:
		//		From an array of axes pick the ones that correspond to this plot and
		//		assign them to the plot using setAxis method.
		// axes: Array
		//		An array of dojox/charting/axis2d/Base
		// tags:
		//		protected
		arr.forEach(this.axes, function(axis){
			if(this[axis]){
				this.setAxis(axes[this[axis]]);
			}
		}, this);
	},
	addSeries: function(run){
		// summary:
		//		Add a data series to this plot.
		// run: dojox.charting.Series
		//		The series to be added.
		// returns: dojox/charting/plot2d/Base
		//		A reference to this plot for functional chaining.
		this.series.push(run);
		return this;	//	dojox/charting/plot2d/Base
	},
	getSeriesStats: function(){
		// summary:
		//		Calculate the min/max on all attached series in both directions.
		// returns: Object
		//		{hmin, hmax, vmin, vmax} min/max in both directions.
		return common.collectSimpleStats(this.series);
	},
	calculateAxes: function(dim){
		// summary:
		//		Stub function for running the axis calculations (deprecated).
		// dim: Object
		//		An object of the form { width, height }
		// returns: dojox/charting/plot2d/Base
		//		A reference to this plot for functional chaining.
		this.initializeScalers(dim, this.getSeriesStats());
		return this;	//	dojox/charting/plot2d/Base
	},
	initializeScalers: function(){
		// summary:
		//		Does nothing.
		return this;
	},
	isDataDirty: function(){
		// summary:
		//		Returns whether or not any of this plot's data series need to be rendered.
		// returns: Boolean
		//		Flag indicating if any of this plot's series are invalid and need rendering.
		return arr.some(this.series, function(item){ return item.dirty; });	//	Boolean
	},
	render: function(dim, offsets){
		// summary:
		//		Render the plot on the chart.
		// dim: Object
		//		An object of the form { width, height }.
		// offsets: Object
		//		An object of the form { l, r, t, b }.
		// returns: dojox/charting/plot2d/Base
		//		A reference to this plot for functional chaining.
		return this;	//	dojox/charting/plot2d/Base
	},
	getRequiredColors: function(){
		// summary:
		//		Get how many data series we have, so we know how many colors to use.
		// returns: Number
		//		The number of colors needed.
		return this.series.length;	//	Number
	}
});
});
