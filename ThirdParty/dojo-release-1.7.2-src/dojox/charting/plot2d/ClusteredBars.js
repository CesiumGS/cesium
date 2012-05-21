define(["dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "./Bars", "./common", 
		"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/utils"], 
	function(lang, arr, declare, Bars, dc, df, dfr, du){
/*=====
var Bars = dojox.charting.plot2d.Bars;
=====*/

	var purgeGroup = dfr.lambda("item.purgeGroup()");

	return declare("dojox.charting.plot2d.ClusteredBars", Bars, {
		//	summary:
		//		A plot representing grouped or clustered bars (horizontal bars)
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.ClusteredBars
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, height, thickness,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._hScaler.bounds.lower),
				baselineWidth = ht(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._vScaler.bounds.scale, this.opt, this.series.length);
			gap = f.gap;
			height = thickness = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i], shift = thickness * (this.series.length - i - 1);
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("bar", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y,
							hv = ht(v),
							width = hv - baselineWidth,
							w = Math.abs(width),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "bar", value, true) :
								t.post(theme, "bar");
						if(w >= 0 && height >= 1){
							var rect = {
								x: offsets.l + (v < baseline ? hv : baselineWidth),
								y: dim.height - offsets.b - vt(j + 1.5) + gap + shift,
								width: w, height: height
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = s.createRect(rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "bar",
									index:   j,
									run:     run,
									shape:   shape,
									x:       v,
									y:       j + 1.5
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateBar(shape, offsets.l + baselineWidth, -width);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.ClusteredBars
		}
	});
});
