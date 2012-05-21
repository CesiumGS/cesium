define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/connect", 
		"../Element", "./_PlotEvents", "dojo/_base/array",
		"../scaler/primitive", "./common", "dojox/gfx/fx"],
	function(lang, declare, hub, Element, PlotEvents, arr, primitive, common, fx){
/*=====
var Element = dojox.charting.Element;
var PlotEvents = dojox.charting.plot2d._PlotEvents;
dojox.charting.plot2d.__PlotCtorArgs = function(){
	//	summary:
	//		The base keyword arguments object for plot constructors.
	//		Note that the parameters for this may change based on the
	//		specific plot type (see the corresponding plot type for
	//		details).
}
=====*/
return declare("dojox.charting.plot2d.Base", [Element, PlotEvents], {
	constructor: function(chart, kwArgs){
		//	summary:
		//		Create a base plot for charting.
		//	chart: dojox.chart.Chart
		//		The chart this plot belongs to.
		//	kwArgs: dojox.charting.plot2d.__PlotCtorArgs?
		//		An optional arguments object to help define the plot.
		this.zoom = null,
		this.zoomQueue = [];	// zooming action task queue
		this.lastWindow = {vscale: 1, hscale: 1, xoffset: 0, yoffset: 0};
	},
	clear: function(){
		//	summary:
		//		Clear out all of the information tied to this plot.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		this.series = [];
		this._hAxis = null;
		this._vAxis = null;
		this.dirty = true;
		return this;	//	dojox.charting.plot2d.Base
	},
	setAxis: function(axis){
		//	summary:
		//		Set an axis for this plot.
		//	axis: dojox.charting.axis2d.Base
		//		The axis to set.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		if(axis){
			this[axis.vertical ? "_vAxis" : "_hAxis"] = axis;
		}
		return this;	//	dojox.charting.plot2d.Base
	},
	toPage: function(coord){
		//	summary:
		//		Compute page coordinates from plot axis data coordinates.
		//	coord: Object?
		//		The coordinates in plot axis data coordinate space. For cartesian charts that is of the following form:
		//			`{ hAxisName: 50, vAxisName: 200 }`
		//		If not provided return the tranform method instead of the result of the transformation.
		//	returns: Object
		//		The resulting page pixel coordinates. That is of the following form:
		//			`{ x: 50, y: 200 }`
		var ah = this._hAxis, av = this._vAxis, 
			sh = ah.getScaler(), sv = av.getScaler(),  
			th = sh.scaler.getTransformerFromModel(sh),
			tv = sv.scaler.getTransformerFromModel(sv),
			c = this.chart.getCoords(),
			o = this.chart.offsets, dim = this.chart.dim;
		var t = function(coord){
			var r = {};
			r.x = th(coord[ah.name]) + c.x + o.l;
			r.y = c.y + dim.height - o.b - tv(coord[av.name]);
			return r;
		};
		// if no coord return the function so that we can capture the current transforms
		// and reuse them later on
		return coord?t(coord):t;
	},
	toData: function(coord){
		//	summary:
		//		Compute plot axis data coordinates from page coordinates.
		//	coord: Object
		//		The pixel coordinate in page coordinate space. That is of the following form:
		//			`{ x: 50, y: 200 }`
		//		If not provided return the tranform method instead of the result of the transformation.
		//	returns: Object
		//		The resulting plot axis data coordinates. For cartesian charts that is of the following form:
		//			`{ hAxisName: 50, vAxisName: 200 }`
		var ah = this._hAxis, av = this._vAxis, 
			sh = ah.getScaler(), sv = av.getScaler(),  
			th = sh.scaler.getTransformerFromPlot(sh),
			tv = sv.scaler.getTransformerFromPlot(sv),
			c = this.chart.getCoords(),
			o = this.chart.offsets, dim = this.chart.dim;
		var t = function(coord){
			var r = {};
			r[ah.name] = th(coord.x - c.x - o.l);
			r[av.name] = tv(c.y + dim.height - coord.y  - o.b);
			return r;
		};
		// if no coord return the function so that we can capture the current transforms
		// and reuse them later on
		return coord?t(coord):t;
	},
	addSeries: function(run){
		//	summary:
		//		Add a data series to this plot.
		//	run: dojox.charting.Series
		//		The series to be added.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		this.series.push(run);
		return this;	//	dojox.charting.plot2d.Base
	},
	getSeriesStats: function(){
		//	summary:
		//		Calculate the min/max on all attached series in both directions.
		//	returns: Object
		//		{hmin, hmax, vmin, vmax} min/max in both directions.
		return common.collectSimpleStats(this.series);
	},
	calculateAxes: function(dim){
		//	summary:
		//		Stub function for running the axis calculations (depricated).
		//	dim: Object
		//		An object of the form { width, height }
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		this.initializeScalers(dim, this.getSeriesStats());
		return this;	//	dojox.charting.plot2d.Base
	},
	isDirty: function(){
		//	summary:
		//		Returns whether or not this plot needs to be rendered.
		//	returns: Boolean
		//		The state of the plot.
		return this.dirty || this._hAxis && this._hAxis.dirty || this._vAxis && this._vAxis.dirty;	//	Boolean
	},
	isDataDirty: function(){
		//	summary:
		//		Returns whether or not any of this plot's data series need to be rendered.
		//	returns: Boolean
		//		Flag indicating if any of this plot's series are invalid and need rendering.
		return arr.some(this.series, function(item){ return item.dirty; });	//	Boolean
	},
	performZoom: function(dim, offsets){
		//	summary:
		//		Create/alter any zooming windows on this plot.
		//	dim: Object
		//		An object of the form { width, height }.
		//	offsets: Object
		//		An object of the form { l, r, t, b }.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.

		// get current zooming various
		var vs = this._vAxis.scale || 1,
			hs = this._hAxis.scale || 1,
			vOffset = dim.height - offsets.b,
			hBounds = this._hScaler.bounds,
			xOffset = (hBounds.from - hBounds.lower) * hBounds.scale,
			vBounds = this._vScaler.bounds,
			yOffset = (vBounds.from - vBounds.lower) * vBounds.scale,
			// get incremental zooming various
			rVScale = vs / this.lastWindow.vscale,
			rHScale = hs / this.lastWindow.hscale,
			rXOffset = (this.lastWindow.xoffset - xOffset)/
				((this.lastWindow.hscale == 1)? hs : this.lastWindow.hscale),
			rYOffset = (yOffset - this.lastWindow.yoffset)/
				((this.lastWindow.vscale == 1)? vs : this.lastWindow.vscale),

			shape = this.group,
			anim = fx.animateTransform(lang.delegate({
				shape: shape,
				duration: 1200,
				transform:[
					{name:"translate", start:[0, 0], end: [offsets.l * (1 - rHScale), vOffset * (1 - rVScale)]},
					{name:"scale", start:[1, 1], end: [rHScale, rVScale]},
					{name:"original"},
					{name:"translate", start: [0, 0], end: [rXOffset, rYOffset]}
				]}, this.zoom));

		lang.mixin(this.lastWindow, {vscale: vs, hscale: hs, xoffset: xOffset, yoffset: yOffset});
		//add anim to zooming action queue,
		//in order to avoid several zooming action happened at the same time
		this.zoomQueue.push(anim);
		//perform each anim one by one in zoomQueue
		hub.connect(anim, "onEnd", this, function(){
			this.zoom = null;
			this.zoomQueue.shift();
			if(this.zoomQueue.length > 0){
				this.zoomQueue[0].play();
			}
		});
		if(this.zoomQueue.length == 1){
			this.zoomQueue[0].play();
		}
		return this;	//	dojox.charting.plot2d.Base
	},
	render: function(dim, offsets){
		//	summary:
		//		Render the plot on the chart.
		//	dim: Object
		//		An object of the form { width, height }.
		//	offsets: Object
		//		An object of the form { l, r, t, b }.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		return this;	//	dojox.charting.plot2d.Base
	},
	getRequiredColors: function(){
		//	summary:
		//		Get how many data series we have, so we know how many colors to use.
		//	returns: Number
		//		The number of colors needed.
		return this.series.length;	//	Number
	},
	initializeScalers: function(dim, stats){
		//	summary:
		//		Initializes scalers using attached axes.
		//	dim: Object:
		//		Size of a plot area in pixels as {width, height}.
		//	stats: Object:
		//		Min/max of data in both directions as {hmin, hmax, vmin, vmax}.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		if(this._hAxis){
			if(!this._hAxis.initialized()){
				this._hAxis.calculate(stats.hmin, stats.hmax, dim.width);
			}
			this._hScaler = this._hAxis.getScaler();
		}else{
			this._hScaler = primitive.buildScaler(stats.hmin, stats.hmax, dim.width);
		}
		if(this._vAxis){
			if(!this._vAxis.initialized()){
				this._vAxis.calculate(stats.vmin, stats.vmax, dim.height);
			}
			this._vScaler = this._vAxis.getScaler();
		}else{
			this._vScaler = primitive.buildScaler(stats.vmin, stats.vmax, dim.height);
		}
		return this;	//	dojox.charting.plot2d.Base
	}
});
});
