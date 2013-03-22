define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/event", "dojo/_base/sniff",
	"./ChartAction", "../Element", "dojox/gesture/tap", "../plot2d/common"],
	function(lang, declare, eventUtil, has, ChartAction, Element, tap, common){
	var GlassView = declare(Element, {
		// summary:
		//		Private internal class used by TouchZoomAndPan actions.
		// tags:
		//		private
		constructor: function(chart){
		},
		render: function(){
			if(!this.isDirty()){
				return;
			}
			this.cleanGroup();
			this.group.createRect({width: this.chart.dim.width, height: this.chart.dim.height}).setFill("rgba(0,0,0,0)");
		},
		clear: function(){
			// summary:
			//		Clear out any parameters set on this plot.
			// returns: GlassView
			//		The reference to this plot for functional chaining.
			this.dirty = true;
			// glass view needs to be above
			if(this.chart.stack[0] != this){
				this.chart.movePlotToFront(this.name);
			}
			return this;	//	GlassView
		},
		getSeriesStats: function(){
			// summary:
			//		Returns default stats (irrelevant for this type of plot).
			// returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			return lang.delegate(common.defaultStats);
		},
		initializeScalers: function(){
			// summary:
			//		Does nothing (irrelevant for this type of plot).
			return this;
		},
		isDirty: function(){
			// summary:
			//		Return whether or not this plot needs to be redrawn.
			// returns: Boolean
			//		If this plot needs to be rendered, this will return true.
			return this.dirty;
		}
	});

	/*=====
	var __TouchZoomAndPanCtorArgs = {
			// summary:
			//		Additional arguments for touch zoom and pan actions.
			// axis: String?
			//		Target axis name for this action.  Default is "x".
			// scaleFactor: Number?
			//		The scale factor applied on mouse wheel zoom.  Default is 1.2.
			// maxScale: Number?
			//		The max scale factor accepted by this chart action.  Default is 100.
			// enableScroll: Boolean?
			//		Whether touch drag gesture should scroll the chart.  Default is true.
			// enableZoom: Boolean?
			//		Whether touch pinch and spread gesture should zoom out or in the chart.  Default is true.
	};
	=====*/

	return declare("dojox.charting.action2d.TouchZoomAndPan", ChartAction, {
		// summary:
		//		Create a touch zoom and pan action.
		//		You can zoom out or in the data window with pinch and spread gestures. You can scroll using drag gesture.
		//		Finally this is possible to navigate between a fit window and a zoom one using double tap gesture.

		// the data description block for the widget parser
		defaultParams: {
			axis: "x",
			scaleFactor: 1.2,
			maxScale: 100,
			enableScroll: true,
			enableZoom: true
		},
		optionalParams: {},	// no optional parameters

		constructor: function(chart, plot, kwArgs){
			// summary:
			//		Create a new touch zoom and pan action and connect it.
			// chart: dojox/charting/Chart
			//		The chart this action applies to.
			// kwArgs: __TouchZoomAndPanCtorArgs?
			//		Optional arguments for the action.
			this._listeners = [
				{eventName: "ontouchstart", methodName: "onTouchStart"},{eventName: "ontouchmove", methodName: "onTouchMove"},
			    {eventName: "ontouchend", methodName: "onTouchEnd"},
				{eventName: tap.doubletap, methodName: "onDoubleTap"}
			];
			if(!kwArgs){ kwArgs = {}; }
			this.axis = kwArgs.axis ? kwArgs.axis : "x";
			this.scaleFactor = kwArgs.scaleFactor ? kwArgs.scaleFactor : 1.2;
			this.maxScale = kwArgs.maxScale ? kwArgs.maxScale : 100;
			this.enableScroll = kwArgs.enableScroll != undefined ? kwArgs.enableScroll : true;
			this.enableZoom = kwArgs.enableScroll != undefined ? kwArgs.enableZoom : true;
			this._uName = "touchZoomPan"+this.axis;
			this.connect();
		},

		connect: function(){
			// summary:
			//		Connect this action to the chart. On Safari this adds a new glass view plot
			//		to the chart that's why Chart.render() must be called after connect.
			this.inherited(arguments);
			// this is needed to workaround issue on Safari + SVG, because a touch start action
			// started above a item that is removed during the touch action will stop
			// dispatching touch events!
			if(has("safari") && this.chart.surface.declaredClass.indexOf("svg")!=-1){
				this.chart.addPlot(this._uName, {type: GlassView});
			}
		},

		disconnect: function(){
			// summary:
			//		Disconnect this action from the chart.
			if(has("safari") && this.chart.surface.declaredClass.indexOf("svg")!=-1){
				this.chart.removePlot(this._uName);
			}
			this.inherited(arguments);
		},

		onTouchStart: function(event){
			// summary:
			//		Called when touch is started on the chart.

			// we always want to be above regular plots and not clipped
			var chart = this.chart, axis = chart.getAxis(this.axis);
			var length = event.touches.length;
			this._startPageCoord = {x: event.touches[0].pageX, y: event.touches[0].pageY};
			if((this.enableZoom || this.enableScroll) && chart._delayedRenderHandle){
				// we have pending rendering from a scroll, let's sync
				chart.render();
			}
			if(this.enableZoom && length >= 2){
				this._endPageCoord =  {x: event.touches[1].pageX, y: event.touches[1].pageY};
				var middlePageCoord = {x: (this._startPageCoord.x + this._endPageCoord.x) / 2,
										y: (this._startPageCoord.y + this._endPageCoord.y) / 2};
				var scaler = axis.getScaler();
				this._initScale = axis.getWindowScale();
				var t = this._initData =  this.plot.toData();
				this._middleCoord = t(middlePageCoord)[this.axis];
				this._startCoord = scaler.bounds.from;
				this._endCoord = scaler.bounds.to;
			}else if(this.enableScroll){
				this._startScroll(axis);
				// needed for Android, otherwise will get a touch cancel while swiping
				eventUtil.stop(event);
			}
		},

		onTouchMove: function(event){
			// summary:
			//		Called when touch is moved on the chart.
			var chart = this.chart, axis = chart.getAxis(this.axis);
			var length = event.touches.length;
			var pAttr = axis.vertical?"pageY":"pageX",
					attr = axis.vertical?"y":"x";
			if(this.enableZoom && length >= 2){
				var newMiddlePageCoord = {x: (event.touches[1].pageX + event.touches[0].pageX) / 2,
											y: (event.touches[1].pageY + event.touches[0].pageY) / 2};
				var scale = (this._endPageCoord[attr] - this._startPageCoord[attr]) /
					(event.touches[1][pAttr] - event.touches[0][pAttr]);

				if(this._initScale / scale > this.maxScale){
					return;
				}

				var newMiddleCoord = this._initData(newMiddlePageCoord)[this.axis];

				var newStart = scale * (this._startCoord - newMiddleCoord)  + this._middleCoord,
				newEnd = scale * (this._endCoord - newMiddleCoord) + this._middleCoord;
				chart.zoomIn(this.axis, [newStart, newEnd]);
				// avoid browser pan
				eventUtil.stop(event);
			}else if(this.enableScroll){
				var delta = axis.vertical?(this._startPageCoord[attr] - event.touches[0][pAttr]):
					(event.touches[0][pAttr] - this._startPageCoord[attr]);
				chart.setAxisWindow(this.axis, this._lastScale, this._initOffset - delta / this._lastFactor / this._lastScale);
				chart.delayedRender();
				// avoid browser pan
				eventUtil.stop(event);
			}
		},

		onTouchEnd: function(event){
			// summary:
			//		Called when touch is ended on the chart.
			var chart = this.chart, axis = chart.getAxis(this.axis);
			if(event.touches.length == 1 && this.enableScroll){
				// still one touch available, let's start back from here for
				// potential pan
				this._startPageCoord = {x: event.touches[0].pageX, y: event.touches[0].pageY};
				this._startScroll(axis);
			}
		},

		_startScroll: function(axis){
			var bounds = axis.getScaler().bounds;
			this._initOffset = axis.getWindowOffset();
			// we keep it because of delay rendering we might now always have access to the
			// information to compute it
			this._lastScale = axis.getWindowScale();
			this._lastFactor = bounds.span / (bounds.upper - bounds.lower);
		},

		onDoubleTap: function(event){
			// summary:
			//		Called when double tap is performed on the chart.
			var chart = this.chart, axis = chart.getAxis(this.axis);
			var scale = 1 / this.scaleFactor;
			// are we fit?
			if(axis.getWindowScale()==1){
				// fit => zoom
				var scaler = axis.getScaler(), start = scaler.bounds.from, end = scaler.bounds.to,
				oldMiddle = (start + end) / 2, newMiddle = this.plot.toData(this._startPageCoord)[this.axis],
				newStart = scale * (start - oldMiddle) + newMiddle, newEnd = scale * (end - oldMiddle) + newMiddle;
				chart.zoomIn(this.axis, [newStart, newEnd]);
			}else{
				// non fit => fit
				chart.setAxisWindow(this.axis, 1, 0);
				chart.render();
			}
			eventUtil.stop(event);
		}
	});
});
