define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/connect", "dojo/_base/window", "dojo/_base/sniff",
	"./ChartAction", "./_IndicatorElement", "dojox/lang/utils", "dojo/_base/event","dojo/_base/array"],
	function(lang, declare, hub, win, has, ChartAction, IndicatorElement, du, eventUtil, arr){ 

	/*=====
	var __MouseIndicatorCtorArgs = {
		// summary:
		//		Additional arguments for mouse indicator.
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
		//		`firstDataPoint` is the `{x, y}` data coordinates pointed by the mouse.
		//		`secondDataPoint` is only useful for dual touch indicators not mouse indicators.
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

	return declare("dojox.charting.action2d.MouseIndicator", ChartAction, {
		// summary:
		//		Create a mouse indicator action. You can drag mouse over the chart to display a data indicator.

		// the data description block for the widget parser
		defaultParams: {
			series: "",
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
			//		Create an mouse indicator action and connect it.
			// chart: dojox/charting/Chart
			//		The chart this action applies to.
			// kwArgs: __MouseIndicatorCtorArgs?
			//		Optional arguments for the chart action.
			this._listeners = [{eventName: "onmousedown", methodName: "onMouseDown"}];
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this._uName = "mouseIndicator"+this.opt.series;
			this._handles = [];
			this.connect();
		},
		
		_disconnectHandles: function(){
			if(has("ie")){
				this.chart.node.releaseCapture();
			}
			arr.forEach(this._handles, hub.disconnect);
			this._handles = [];
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
			if(this._isMouseDown){
				this.onMouseUp();
			}
			this.chart.removePlot(this._uName);
			this.inherited(arguments);
			this._disconnectHandles();
		},

		onMouseDown: function(event){
			// summary:
			//		Called when mouse is down on the chart.
			this._isMouseDown = true;
			
			//ff we now want to capture mouse move events everywhere to avoid
			// stop scrolling when going out of the chart window
			if(has("ie")){
				this._handles.push(hub.connect(this.chart.node, "onmousemove", this, "onMouseMove"));
				this._handles.push(hub.connect(this.chart.node, "onmouseup", this, "onMouseUp"));
				this.chart.node.setCapture();
			}else{
				this._handles.push(hub.connect(win.doc, "onmousemove", this, "onMouseMove"));
				this._handles.push(hub.connect(win.doc, "onmouseup", this, "onMouseUp"));
			}	
			
			this._onMouseSingle(event);
		},

		onMouseMove: function(event){
			// summary:
			//		Called when the mouse is moved on the chart.
			if(this._isMouseDown){
				this._onMouseSingle(event);
			}
		},

		_onMouseSingle: function(event){
			var plot = this.chart.getPlot(this._uName);
			plot.pageCoord  = {x: event.pageX, y: event.pageY};
			plot.dirty = true;
			this.chart.render();
			eventUtil.stop(event);
		},

		onMouseUp: function(event){
			// summary:
			//		Called when mouse is up on the chart.
			var plot = this.chart.getPlot(this._uName);
			plot.stopTrack();
			this._isMouseDown = false;
			this._disconnectHandles();
			plot.pageCoord = null;
			plot.dirty = true;
			this.chart.render();
		}
	});
});
