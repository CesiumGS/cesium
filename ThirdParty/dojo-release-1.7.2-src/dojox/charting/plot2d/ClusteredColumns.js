define(["dojo/_base/array", "dojo/_base/declare", "./Columns", "./common", 
		"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/utils"], 
	function(arr, declare, Columns, dc, df, dfr, du){
/*=====
var Columns = dojox.charting.plot2d.Columns;
=====*/

	var purgeGroup = dfr.lambda("item.purgeGroup()");

	return declare("dojox.charting.plot2d.ClusteredColumns", Columns, {
		//	summary:
		//		A plot representing grouped or clustered columns (vertical bars).
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.ClusteredColumns
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
			var t = this.chart.theme, f, gap, width, thickness,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._vScaler.bounds.lower),
				baselineHeight = vt(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt, this.series.length);
			gap = f.gap;
			width = thickness = f.size;
			for(var i = 0; i < this.series.length; ++i){
				var run = this.series[i], shift = thickness * i;
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("column", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y,
							vv = vt(v),
							height = vv - baselineHeight,
							h = Math.abs(height),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "column", value, true) :
								t.post(theme, "column");
						if(width >= 1 && h >= 0){
							var rect = {
								x: offsets.l + ht(j + 0.5) + gap + shift,
								y: dim.height - offsets.b - (v > baseline ? vv : baselineHeight),
								width: width, height: h
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = s.createRect(rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "column",
									index:   j,
									run:     run,
									shape:   shape,
									x:       j + 0.5,
									y:       v
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateColumn(shape, dim.height - offsets.b - baselineHeight, h);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.ClusteredColumns
		}
	});
});
