define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/event", "./ChartAction", "./_IndicatorElement", "dojox/lang/utils"],
	function(lang, declare, eventUtil, ChartAction, IndicatorElement, du){ 
	
	/*=====
	var __TouchIndicatorCtorArgs = {
			// summary:
			//		Additional arguments for touch indicator.
			// series: String
			//		Target series name for this action.
			// autoScroll: Boolean?
			//		Whether when moving indicator the chart is automatically scrolled. Default is true.
			// vertical: Boolean?
			//		Whether the indicator is vertical or not. Default is true.
			// fixed: Boolean?
			//		Whether a fixed precision must be applied to data values for display. Default is true.
			// precision: Number?
			//		The precision at which to round data values for display. Default is 1.
			// lineStroke: dojo/gfx/Stroke?
			//		An optional stroke to use for indicator line.
			// lineOutline: dojo/gfx/Stroke?
			//		An optional outline to use for indicator line.
			// lineShadow: dojo/gfx/Stroke?
			//		An optional shadow to use for indicator line.
			// stroke: dojo.gfx.Stroke?
			//		An optional stroke to use for indicator label background.
			// outline: dojo.gfx.Stroke?
			//		An optional outline to use for indicator label background.
			// shadow: dojo.gfx.Stroke?
			//		An optional shadow to use for indicator label background.
			// fill: dojo.gfx.Fill?
			//		An optional fill to use for indicator label background.
			// fillFunc: Function?
			//		An optional function to use to compute label background fill. It takes precedence over
			//		fill property when available.
			// labelFunc: Function?
			//		An optional function to use to compute label text. It takes precedence over
			//		the default text when available.
			//	|		function labelFunc(firstDataPoint, secondDataPoint, fixed, precision) {}
			//		`firstDataPoint` is the `{x, y}` data coordinates pointed by the touch point.
			//		`secondDataPoint` is the data coordinates pointed by the second touch point.
			//		`fixed` is true if fixed precision must be applied.
			//		`precision` is the requested precision to be applied.
			// font: String?
			//		A font definition to use for indicator label background.
			// fontColor: String|dojo.Color?
			//		The color to use for indicator label background.
			// markerStroke: dojo.gfx.Stroke?
			//		An optional stroke to use for indicator marker.
			// markerOutline: dojo.gfx.Stroke?
			//		An optional outline to use for indicator marker.
			// markerShadow: dojo.gfx.Stroke?
			//		An optional shadow to use for indicator marker.
			// markerFill: dojo.gfx.Fill?
			//		An optional fill to use for indicator marker.
			// markerSymbol: String?
			//		An optional symbol string to use for indicator marker.
		};
	=====*/

	return declare("dojox.charting.action2d.TouchIndicator", ChartAction, {
		// summary:
		//		Create a touch indicator action. You can touch over the chart to display a data indicator.

		// the data description block for the widget parser
		defaultParams: {
			series: "",
			dualIndicator: false,
			vertical: true,
			autoScroll: true,
			fixed: true,
			precision: 0
		},
		optionalParams: {
			lineStroke: {},
			outlineStroke: {},
			shadowStroke: {},
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			fillFunc:  null,
			labelFunc: null,
			font:		"",
			fontColor:	"",
			markerStroke:		{},
			markerOutline:		{},
			markerShadow:		{},
			markerFill:			{},
			markerSymbol:		""
		},	

		constructor: function(chart, plot, kwArgs){
			// summary:
			//		Create a new touch indicator action and connect it.
			// chart: dojox/charting/Chart
			//		The chart this action applies to.
			// kwArgs: __TouchIndicatorCtorArgs?
			//		Optional arguments for the chart action.
			this._listeners = [
				{eventName: "ontouchstart", methodName: "onTouchStart"},
				{eventName: "ontouchmove", methodName: "onTouchMove"},
				{eventName: "ontouchend", methodName: "onTouchEnd"},
				{eventName: "ontouchcancel", methodName: "onTouchEnd"}
			];
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this._uName = "touchIndicator"+this.opt.series;
			this.connect();
		},
		
		connect: function(){
			// summary:
			//		Connect this action to the chart. This adds a indicator plot
			//		to the chart that's why Chart.render() must be called after connect.
			this.inherited(arguments);
			// add plot with unique name
			this.chart.addPlot(this._uName, {type: IndicatorElement, inter: this});
		},

		disconnect: function(){
			// summary:
			//		Disconnect this action from the chart.
			var plot = this.chart.getPlot(this._uName);
			if(plot.pageCoord){
				// we might still have something drawn on the screen
				this.onTouchEnd();
			}
			this.chart.removePlot(this._uName);
			this.inherited(arguments);
		},

		onTouchStart: function(event){
			// summary:
			//		Called when touch is started on the chart.		
			if(event.touches.length==1){
				this._onTouchSingle(event, true);
			}else if(this.opt.dualIndicator && event.touches.length==2){
				this._onTouchDual(event);
			}
		},

		onTouchMove: function(event){
			// summary:
			//		Called when touch is moved on the chart.
			if(event.touches.length==1){
				this._onTouchSingle(event);
			}else if(this.opt.dualIndicator && event.touches.length==2){
				this._onTouchDual(event);
			}
		},

		_onTouchSingle: function(event, delayed){
			if(this.chart._delayedRenderHandle && !delayed){
				// we have pending rendering from a previous call, let's sync
				this.chart.render();
			}
			var plot = this.chart.getPlot(this._uName);
			plot.pageCoord  = {x: event.touches[0].pageX, y: event.touches[0].pageY};
			plot.dirty = true;
			if(delayed){
				this.chart.delayedRender();
			}else{
				this.chart.render();
			}
			eventUtil.stop(event);
		},
		
		_onTouchDual: function(event){
			// sync
			if(this.chart._delayedRenderHandle){
				// we have pending rendering from a previous call, let's sync
				this.chart.render();
			}
			var plot = this.chart.getPlot(this._uName);
			plot.pageCoord = {x: event.touches[0].pageX, y: event.touches[0].pageY};
			plot.secondCoord = {x: event.touches[1].pageX, y: event.touches[1].pageY};
			plot.dirty = true;
			this.chart.render();
			eventUtil.stop(event);
		},

		onTouchEnd: function(event){
			// summary:
			//		Called when touch is ended or canceled on the chart.
			var plot = this.chart.getPlot(this._uName);
			plot.stopTrack();
			plot.pageCoord = null;
			plot.secondCoord = null;
			plot.dirty = true;
			this.chart.delayedRender();
		}
	});
});
