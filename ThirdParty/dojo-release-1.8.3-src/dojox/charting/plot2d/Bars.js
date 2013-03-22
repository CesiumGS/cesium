define(["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "./CartesianBase", "./_PlotEvents", "./common",
	"dojox/gfx/fx", "dojox/lang/utils", "dojox/lang/functional", "dojox/lang/functional/reversed"], 
	function(dojo, lang, arr, declare, CartesianBase, _PlotEvents, dc, fx, du, df, dfr){
		
	/*=====
	declare("dojox.charting.plot2d.__BarCtorArgs", dojox.charting.plot2d.__DefaultCtorArgs, {
		// summary:
		//		Additional keyword arguments for bar charts.
	
		// minBarSize: Number?
		//		The minimum size for a bar in pixels.  Default is 1.
		minBarSize: 1,
	
		// maxBarSize: Number?
		//		The maximum size for a bar in pixels.  Default is 1.
		maxBarSize: 1,

		// stroke: dojox.gfx.Stroke?
		//		An optional stroke to use for any series on the plot.
		stroke:		{},

		// outline: dojox.gfx.Stroke?
		//		An optional stroke used to outline any series on the plot.
		outline:	{},

		// shadow: dojox.gfx.Stroke?
		//		An optional stroke to use to draw any shadows for a series on a plot.
		shadow:		{},

		// fill: dojox.gfx.Fill?
		//		Any fill to be used for elements on the plot.
		fill:		{},

		// styleFunc: Function?
		//		A function that returns a styling object for the a given data item.
		styleFunc:	null,

		// font: String?
		//		A font definition to be used for labels and other text-based elements on the plot.
		font:		"",

		// fontColor: String|dojo.Color?
		//		The color to be used for any text-based elements on the plot.
		fontColor:	"",
		
		// enableCache: Boolean?
		//		Whether the bars rect are cached from one rendering to another. This improves the rendering performance of
		//		successive rendering but penalize the first rendering.  Default false.
		enableCache: false
	});
	=====*/
	var purgeGroup = dfr.lambda("item.purgeGroup()");

	return declare("dojox.charting.plot2d.Bars", [CartesianBase, _PlotEvents], {
		// summary:
		//		The plot object representing a bar chart (horizontal bars).
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			gap:	0,		// gap between columns in pixels
			animate: null,   // animate bars into place
			enableCache: false
		},
		optionalParams: {
			minBarSize:	1,	// minimal bar width in pixels
			maxBarSize:	1,	// maximal bar width in pixels
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			styleFunc:  null,
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			// summary:
			//		The constructor for a bar chart.
			// chart: dojox/charting/Chart
			//		The chart this plot belongs to.
			// kwArgs: dojox.charting.plot2d.__BarCtorArgs?
			//		An optional keyword arguments object to help define the plot.
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		getSeriesStats: function(){
			// summary:
			//		Calculate the min/max on all attached series in both directions.
			// returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectSimpleStats(this.series), t;
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			t = stats.hmin, stats.hmin = stats.vmin, stats.vmin = t;
			t = stats.hmax, stats.hmax = stats.vmax, stats.vmax = t;
			return stats; // Object
		},
		
		createRect: function(run, creator, params){
			var rect;
			if(this.opt.enableCache && run._rectFreePool.length > 0){
				rect = run._rectFreePool.pop();
				rect.setShape(params);
				// was cleared, add it back
				creator.add(rect);
			}else{
				rect = creator.createRect(params);
			}
			if(this.opt.enableCache){
				run._rectUsePool.push(rect);
			}
			return rect;
		},

		render: function(dim, offsets){
			// summary:
			//		Run the calculations for any axes for this plot.
			// dim: Object
			//		An object in the form of { width, height }
			// offsets: Object
			//		An object of the form { l, r, t, b}.
			// returns: dojox/charting/plot2d/Bars
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets); // dojox/charting/plot2d/Bars
			}
			this.dirty = this.isDirty();
			this.resetEvents();
			var s;
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._hScaler.bounds.lower),
				baselineWidth = ht(baseline),
				events = this.events();
			var bar = this.getBarProperties();
			
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				if(this.opt.enableCache){
					run._rectFreePool = (run._rectFreePool?run._rectFreePool:[]).concat(run._rectUsePool?run._rectUsePool:[]);
					run._rectUsePool = [];
				}
				var theme = t.next("bar", [this.opt, run]),
					eventSeries = new Array(run.data.length);
				s = run.group;
				var indexed = arr.some(run.data, function(item){
					return typeof item == "number" || (item && !item.hasOwnProperty("x"));
				});
				// on indexed charts we can easily just interate from the first visible to the last visible
				// data point to save time
				var min = indexed?Math.max(0, Math.floor(this._vScaler.bounds.from - 1)):0;
				var max = indexed?Math.min(run.data.length, Math.ceil(this._vScaler.bounds.to)):run.data.length;
				for(var j = min; j < max; ++j){
					var value = run.data[j];
					if(value != null){
						var val = this.getValue(value, j, i, indexed),
							hv = ht(val.y),
							w = Math.abs(hv - baselineWidth),
							finalTheme,
							sshape;
						if(this.opt.styleFunc || typeof value != "number"){
							var tMixin = typeof value != "number" ? [value] : [];
							if(this.opt.styleFunc){
								tMixin.push(this.opt.styleFunc(value));
							}
							finalTheme = t.addMixin(theme, "bar", tMixin, true);
						}else{
							finalTheme = t.post(theme, "bar");
						}
						if(w >= 0 && bar.height >= 1){
							var rect = {
								x: offsets.l + (val.y < baseline ? hv : baselineWidth),
								y: dim.height - offsets.b - vt(val.x + 1.5) + bar.gap + bar.thickness * (this.series.length - i - 1),
								width: w,
								height: bar.height
							};
							if(finalTheme.series.shadow){
								var srect = lang.clone(rect);
								srect.x += finalTheme.series.shadow.dx;
								srect.y += finalTheme.series.shadow.dy;
								sshape = this.createRect(run, s, srect).setFill(finalTheme.series.shadow.color).setStroke(finalTheme.series.shadow);
								if(this.animate){
									this._animateBar(sshape, offsets.l + baselineWidth, -w);
								}
							}
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = this.createRect(run, s, rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "bar",
									index:   j,
									run:     run,
									shape:   shape,
									shadow:	 sshape,
									x:       val.y,
									y:       val.x + 1.5
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateBar(shape, offsets.l + baselineWidth, -w);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox/charting/plot2d/Bars
		},
		getValue: function(value, j, seriesIndex, indexed){
			var y,x;
			if(indexed){
				if(typeof value == "number"){
					y = value;
				}else{
					y = value.y;
				}
				x = j;
			}else{
				y = value.y;
				x = value.x -1;
			}
			return {y:y, x:x};
		},
		getBarProperties: function(){
			var f = dc.calculateBarSize(this._vScaler.bounds.scale, this.opt);
			return {gap: f.gap, height: f.size, thickness: 0};
		},
		_animateBar: function(shape, hoffset, hsize){
			if(hsize==0){
				hsize = 1;
			}
			fx.animateTransform(lang.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [hoffset - (hoffset/hsize), 0], end: [0, 0]},
					{name: "scale", start: [1/hsize, 1], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
});
