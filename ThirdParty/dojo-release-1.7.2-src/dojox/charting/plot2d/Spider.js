define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/connect", "dojo/_base/html", "dojo/_base/array",
	"dojo/dom-geometry", "dojo/_base/fx", "dojo/fx", "dojo/_base/sniff", 
	"../Element", "./_PlotEvents", "dojo/_base/Color", "dojox/color/_base", "./common", "../axis2d/common", 
	"../scaler/primitive", "dojox/gfx", "dojox/gfx/matrix", "dojox/gfx/fx", "dojox/lang/functional", 
	"dojox/lang/utils", "dojo/fx/easing"],
	function(lang, declare, hub, html, arr, domGeom, baseFx, coreFx, has, 
			Element, PlotEvents, Color, dxcolor, dc, da, primitive,
			g, m, gfxfx, df, du, easing){
/*=====
var Element = dojox.charting.Element;
var PlotEvents = dojox.charting.plot2d._PlotEvents;
=====*/
	var FUDGE_FACTOR = 0.2; // use to overlap fans

	var Spider = declare("dojox.charting.plot2d.Spider", [Element, PlotEvents], {
		//	summary:
		//		The plot that represents a typical Spider chart.
		defaultParams: {
			labels:			true,
			ticks:			false,
			fixed:			true,
			precision:		1,
			labelOffset:	-10,
			labelStyle:		"default",	// default/rows/auto
			htmlLabels:		true,		// use HTML to draw labels
			startAngle:		-90,		// start angle for slices in degrees
			divisions:		 3,			// radius tick count
			axisColor:		 "",		// spider axis color
			axisWidth:		 0,			// spider axis stroke width
			spiderColor:	 "",		// spider web color
			spiderWidth:	 0,			// spider web stroke width
			seriesWidth:	 0,			// plot border with
			seriesFillAlpha: 0.2,		// plot fill alpha
			spiderOrigin:	 0.16,
			markerSize:		 3,			// radius of plot vertex (px)
			spiderType:		 "polygon", //"circle"
			animationType:	 easing.backOut,
			axisTickFont:		"",
			axisTickFontColor:	"",
			axisFont:			"",
			axisFontColor:		""
		},
		optionalParams: {
			radius:		0,
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		Create a Spider plot.
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.dyn = [];
			this.datas = {};
			this.labelKey = [];
			this.oldSeriePoints = {};
			this.animations = {};
		},
		clear: function(){
			//	summary:
			//		Clear out all of the information tied to this plot.
			//	returns: dojox.charting.plot2d.Spider
			//		A reference to this plot for functional chaining.
			this.dirty = true;
			this.dyn = [];
			this.series = [];
			this.datas = {};
			this.labelKey = [];
			this.oldSeriePoints = {};
			this.animations = {};
			return this;	//	dojox.charting.plot2d.Spider
		},
		setAxis: function(axis){
			//	summary:
			//		Dummy method, since axes are irrelevant with a Spider chart.
			//	returns: dojox.charting.plot2d.Spider
			//		The reference to this plot for functional chaining.
			return this;	//	dojox.charting.plot2d.Spider
		},
		addSeries: function(run){
			//	summary:
			//		Add a data series to this plot.
			//	run: dojox.charting.Series
			//		The series to be added.
			//	returns: dojox.charting.plot2d.Base
			//		A reference to this plot for functional chaining.
			var matched = false;
			this.series.push(run);
			for(var key in run.data){
				var val = run.data[key],
					data = this.datas[key];
				if(data){
					data.vlist.push(val);
					data.min = Math.min(data.min, val);
					data.max = Math.max(data.max, val);
				}else{
					this.datas[key] = {min: val, max: val, vlist: [val]};
				}
			}
			if (this.labelKey.length <= 0) {
				for (var key in run.data) {
					this.labelKey.push(key);
				}
			}
			return this;	//	dojox.charting.plot2d.Base
		},
		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			return dc.collectSimpleStats(this.series);
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
		},
		render: function(dim, offsets){
			//	summary:
			//		Render the plot on the chart.
			//	dim: Object
			//		An object of the form { width, height }.
			//	offsets: Object
			//		An object of the form { l, r, t, b }.
			//	returns: dojox.charting.plot2d.Spider
			//		A reference to this plot for functional chaining.
			if(!this.dirty){ return this; }
			this.dirty = false;
			this.cleanGroup();
			var s = this.group, t = this.chart.theme;
			this.resetEvents();

			if(!this.series || !this.series.length){
				return this;
			}

			// calculate the geometry
			var o = this.opt, ta = t.axis,
				rx = (dim.width	 - offsets.l - offsets.r) / 2,
				ry = (dim.height - offsets.t - offsets.b) / 2,
				r  = Math.min(rx, ry),
				axisTickFont = o.font || (ta.majorTick && ta.majorTick.font) || (ta.tick && ta.tick.font) || "normal normal normal 7pt Tahoma",
				axisFont = o.axisFont || (ta.tick && ta.tick.titleFont) || "normal normal normal 11pt Tahoma",
				axisTickFontColor = o.axisTickFontColor || (ta.majorTick && ta.majorTick.fontColor) || (ta.tick && ta.tick.fontColor) || "silver",
				axisFontColor = o.axisFontColor || (ta.tick && ta.tick.titleFontColor) || "black",
				axisColor = o.axisColor || (ta.tick && ta.tick.axisColor) || "silver",
				spiderColor = o.spiderColor || (ta.tick && ta.tick.spiderColor) || "silver",
				axisWidth = o.axisWidth || (ta.stroke && ta.stroke.width) || 2,
				spiderWidth = o.spiderWidth || (ta.stroke && ta.stroke.width) || 2,
				seriesWidth = o.seriesWidth || (ta.stroke && ta.stroke.width) || 2,
				asize = g.normalizedLength(g.splitFontString(axisFont).size),
				startAngle = m._degToRad(o.startAngle),
				start = startAngle, step, filteredRun, slices, labels, shift, labelR,
				outerPoints, innerPoints, divisionPoints, divisionRadius, labelPoints,
				ro = o.spiderOrigin, dv = o.divisions >= 3 ? o.divisions : 3, ms = o.markerSize,
				spt = o.spiderType, at = o.animationType, lboffset = o.labelOffset < -10 ? o.labelOffset : -10,
				axisExtra = 0.2;
			
			if(o.labels){
				labels = arr.map(this.series, function(s){
					return s.name;
				}, this);
				shift = df.foldl1(df.map(labels, function(label, i){
					var font = t.series.font;
					return g._base._getTextBox(label, {
						font: font
					}).w;
				}, this), "Math.max(a, b)") / 2;
				r = Math.min(rx - 2 * shift, ry - asize) + lboffset;
				labelR = r - lboffset;
			}
			if ("radius" in o) {
				r = o.radius;
				labelR = r - lboffset;
			}
			r /= (1+axisExtra);
			var circle = {
				cx: offsets.l + rx,
				cy: offsets.t + ry,
				r: r
			};
			
			for (var i = this.series.length - 1; i >= 0; i--) {
				var serieEntry = this.series[i];
				if (!this.dirty && !serieEntry.dirty) {
					t.skip();
					continue;
				}
				serieEntry.cleanGroup();
				var run = serieEntry.data;
				if (run !== null) {
					var len = this._getObjectLength(run);
					//construct connect points
					if (!outerPoints || outerPoints.length <= 0) {
						outerPoints = [], innerPoints = [], labelPoints = [];
						this._buildPoints(outerPoints, len, circle, r, start, true);
						this._buildPoints(innerPoints, len, circle, r*ro, start, true);
						this._buildPoints(labelPoints, len, circle, labelR, start);
						if(dv > 2){
							divisionPoints = [], divisionRadius = [];
							for (var j = 0; j < dv - 2; j++) {
								divisionPoints[j] = [];
								this._buildPoints(divisionPoints[j], len, circle, r*(ro + (1-ro)*(j+1)/(dv-1)), start, true);
								divisionRadius[j] = r*(ro + (1-ro)*(j+1)/(dv-1));
							}
						}
					}
				}
			}
			
			//draw Spider
			//axis
			var axisGroup = s.createGroup(), axisStroke = {color: axisColor, width: axisWidth},
				spiderStroke = {color: spiderColor, width: spiderWidth};
			for (var j = outerPoints.length - 1; j >= 0; --j) {
				var point = outerPoints[j],
					st = {
						x: point.x + (point.x - circle.cx) * axisExtra,
						y: point.y + (point.y - circle.cy) * axisExtra
					},
					nd = {
						x: point.x + (point.x - circle.cx) * axisExtra / 2,
						y: point.y + (point.y - circle.cy) * axisExtra / 2
					};
				axisGroup.createLine({
					x1: circle.cx,
					y1: circle.cy,
					x2: st.x,
					y2: st.y
				}).setStroke(axisStroke);
				//arrow
				this._drawArrow(axisGroup, st, nd, axisStroke);
			}
			
			// draw the label
			var labelGroup = s.createGroup();
			for (var j = labelPoints.length - 1; j >= 0; --j) {
				var point = labelPoints[j],
					fontWidth = g._base._getTextBox(this.labelKey[j], {font: axisFont}).w || 0,
					render = this.opt.htmlLabels && g.renderer != "vml" ? "html" : "gfx",
					elem = da.createText[render](this.chart, labelGroup, (!domGeom.isBodyLtr() && render == "html") ? (point.x + fontWidth - dim.width) : point.x, point.y,
							"middle", this.labelKey[j], axisFont, axisFontColor);
				if (this.opt.htmlLabels) {
					this.htmlElements.push(elem);
				}
			}
			
			//spider web: polygon or circle
			var spiderGroup = s.createGroup();
			if(spt == "polygon"){
				spiderGroup.createPolyline(outerPoints).setStroke(spiderStroke);
				spiderGroup.createPolyline(innerPoints).setStroke(spiderStroke);
				if (divisionPoints.length > 0) {
					for (var j = divisionPoints.length - 1; j >= 0; --j) {
						spiderGroup.createPolyline(divisionPoints[j]).setStroke(spiderStroke);
					}
				}
			}else{//circle
				var ccount = this._getObjectLength(this.datas);
				spiderGroup.createCircle({cx: circle.cx, cy: circle.cy, r: r}).setStroke(spiderStroke);
				spiderGroup.createCircle({cx: circle.cx, cy: circle.cy, r: r*ro}).setStroke(spiderStroke);
				if (divisionRadius.length > 0) {
					for (var j = divisionRadius.length - 1; j >= 0; --j) {
						spiderGroup.createCircle({cx: circle.cx, cy: circle.cy, r: divisionRadius[j]}).setStroke(spiderStroke);
					}
				}
			}
			//text
			var textGroup = s.createGroup(), len = this._getObjectLength(this.datas), k = 0;
			for(var key in this.datas){
				var data = this.datas[key], min = data.min, max = data.max, distance = max - min,
					end = start + 2 * Math.PI * k / len;
				for (var i = 0; i < dv; i++) {
					var text = min + distance*i/(dv-1), point = this._getCoordinate(circle, r*(ro + (1-ro)*i/(dv-1)), end);
					text = this._getLabel(text);
					var fontWidth = g._base._getTextBox(text, {font: axisTickFont}).w || 0,
						render = this.opt.htmlLabels && g.renderer != "vml" ? "html" : "gfx";
					if (this.opt.htmlLabels) {
						this.htmlElements.push(da.createText[render]
							(this.chart, textGroup, (!domGeom.isBodyLtr() && render == "html") ? (point.x + fontWidth - dim.width) : point.x, point.y,
								"start", text, axisTickFont, axisTickFontColor));
					}
				}
				k++;
			}
			
			//draw series (animation)
			this.chart.seriesShapes = {};
			var animationConnections = [];
			for (var i = this.series.length - 1; i >= 0; i--) {
				var serieEntry = this.series[i], run = serieEntry.data;
				if (run !== null) {
					//series polygon
					var seriePoints = [], k = 0, tipData = [];
					for(var key in run){
						var data = this.datas[key], min = data.min, max = data.max, distance = max - min,
							entry = run[key], end = start + 2 * Math.PI * k / len,
							point = this._getCoordinate(circle, r*(ro + (1-ro)*(entry-min)/distance), end);
						seriePoints.push(point);
						tipData.push({sname: serieEntry.name, key: key, data: entry});
						k++;
					}
					seriePoints[seriePoints.length] = seriePoints[0];
					tipData[tipData.length] = tipData[0];
					var polygonBoundRect = this._getBoundary(seriePoints),
						theme = t.next("spider", [o, serieEntry]), ts = serieEntry.group,
						f = g.normalizeColor(theme.series.fill), sk = {color: theme.series.fill, width: seriesWidth};
					f.a = o.seriesFillAlpha;
					serieEntry.dyn = {fill: f, stroke: sk};
					
					var osps = this.oldSeriePoints[serieEntry.name];
					var cs = this._createSeriesEntry(ts, (osps || innerPoints), seriePoints, f, sk, r, ro, ms, at);
					this.chart.seriesShapes[serieEntry.name] = cs;
					this.oldSeriePoints[serieEntry.name] = seriePoints;
					
					var po = {
						element: "spider_poly",
						index:	 i,
						id:		 "spider_poly_"+serieEntry.name,
						run:	 serieEntry,
						plot:	 this,
						shape:	 cs.poly,
						parent:	 ts,
						brect:	 polygonBoundRect,
						cx:		 circle.cx,
						cy:		 circle.cy,
						cr:		 r,
						f:		 f,
						s:		 s
					};
					this._connectEvents(po);
					
					var so = {
						element: "spider_plot",
						index:	 i,
						id:		 "spider_plot_"+serieEntry.name,
						run:	 serieEntry,
						plot:	 this,
						shape:	 serieEntry.group
					};
					this._connectEvents(so);
					
					arr.forEach(cs.circles, function(c, i){
						var shape = c.getShape(),
							co = {
								element: "spider_circle",
								index:	 i,
								id:		 "spider_circle_"+serieEntry.name+i,
								run:	 serieEntry,
								plot:	 this,
								shape:	 c,
								parent:	 ts,
								tdata:	 tipData[i],
								cx:		 seriePoints[i].x,
								cy:		 seriePoints[i].y,
								f:		 f,
								s:		 s
							};
						this._connectEvents(co);
					}, this);
				}
			}
			return this;	//	dojox.charting.plot2d.Spider
		},
		_createSeriesEntry: function(ts, osps, sps, f, sk, r, ro, ms, at){
			//polygon
			var spoly = ts.createPolyline(osps).setFill(f).setStroke(sk), scircle = [];
			for (var j = 0; j < osps.length; j++) {
				var point = osps[j], cr = ms;
				var circle = ts.createCircle({cx: point.x, cy: point.y, r: cr}).setFill(f).setStroke(sk);
				scircle.push(circle);
			}
			
			var anims = arr.map(sps, function(np, j){
				// create animation
				var sp = osps[j],
					anim = new baseFx.Animation({
					duration: 1000,
					easing:	  at,
					curve:	  [sp.y, np.y]
				});
				var spl = spoly, sc = scircle[j];
				hub.connect(anim, "onAnimate", function(y){
					//apply poly
					var pshape = spl.getShape();
					pshape.points[j].y = y;
					spl.setShape(pshape);
					//apply circle
					var cshape = sc.getShape();
					cshape.cy = y;
					sc.setShape(cshape);
				});
				return anim;
			});
			
			var anims1 = arr.map(sps, function(np, j){
				// create animation
				var sp = osps[j],
					anim = new baseFx.Animation({
					duration: 1000,
					easing:	  at,
					curve:	  [sp.x, np.x]
				});
				var spl = spoly, sc = scircle[j];
				hub.connect(anim, "onAnimate", function(x){
					//apply poly
					var pshape = spl.getShape();
					pshape.points[j].x = x;
					spl.setShape(pshape);
					//apply circle
					var cshape = sc.getShape();
					cshape.cx = x;
					sc.setShape(cshape);
				});
				return anim;
			});
			var masterAnimation = coreFx.combine(anims.concat(anims1)); //dojo.fx.chain(anims);
			masterAnimation.play();
			return {group :ts, poly: spoly, circles: scircle};
		},
		plotEvent: function(o){
			//	summary:
			//		Stub function for use by specific plots.
			//	o: Object
			//		An object intended to represent event parameters.
			var runName = o.id ? o.id : "default", a;
			if (runName in this.animations) {
				a = this.animations[runName];
				a.anim && a.anim.stop(true);
			} else {
				a = this.animations[runName] = {};
			}
			if(o.element == "spider_poly"){
				if(!a.color){
					var color = o.shape.getFill();
					if(!color || !(color instanceof Color)){
						return;
					}
					a.color = {
						start: color,
						end:   transColor(color)
					};
				}
				var start = a.color.start, end = a.color.end;
				if(o.type == "onmouseout"){
					// swap colors
					var t = start; start = end; end = t;
				}
				a.anim = gfxfx.animateFill({
					shape:	  o.shape,
					duration: 800,
					easing:	  easing.backOut,
					color:	  {start: start, end: end}
				});
				a.anim.play();
			}else if(o.element == "spider_circle"){
				var init, scale, defaultScale = 1.5;
				if(o.type == "onmouseover"){
					init  = m.identity;
					scale = defaultScale;
					//show tooltip
					var aroundRect = {type: "rect"};
					aroundRect.x = o.cx;
					aroundRect.y = o.cy;
					aroundRect.width = aroundRect.height = 1;
					var lt = html.coords(this.chart.node, true);
					aroundRect.x += lt.x;
					aroundRect.y += lt.y;
					aroundRect.x = Math.round(aroundRect.x);
					aroundRect.y = Math.round(aroundRect.y);
					aroundRect.width = Math.ceil(aroundRect.width);
					aroundRect.height = Math.ceil(aroundRect.height);
					this.aroundRect = aroundRect;
					var position = ["after", "before"];
					dc.doIfLoaded("dijit/Tooltip", dojo.hitch(this, function(Tooltip){
						Tooltip.show(o.tdata.sname + "<br/>" + o.tdata.key + "<br/>" + o.tdata.data, this.aroundRect, position);
					}));
				}else{
					init  = m.scaleAt(defaultScale, o.cx, o.cy);
					scale = 1/defaultScale;
					dc.doIfLoaded("dijit/Tooltip", dojo.hitch(this, function(Tooltip){
						this.aroundRect && Tooltip.hide(this.aroundRect);
					}));
				}
				var cs = o.shape.getShape(),
					init = m.scaleAt(defaultScale, cs.cx, cs.cy),
					kwArgs = {
						shape: o.shape,
						duration: 200,
						easing:	  easing.backOut,
						transform: [
							{name: "scaleAt", start: [1, cs.cx, cs.cy], end: [scale, cs.cx, cs.cy]},
							init
						]
					};
				a.anim = gfxfx.animateTransform(kwArgs);
				a.anim.play();
			}else if(o.element == "spider_plot"){
				//dojo gfx function "moveToFront" not work in IE
				if (o.type == "onmouseover" && !has("ie")) {
					o.shape.moveToFront();
				}
			}
		},
		_getBoundary: function(points){
			var xmax = points[0].x,
				xmin = points[0].x,
				ymax = points[0].y,
				ymin = points[0].y;
			for(var i = 0; i < points.length; i++){
				var point = points[i];
				xmax = Math.max(point.x, xmax);
				ymax = Math.max(point.y, ymax);
				xmin = Math.min(point.x, xmin);
				ymin = Math.min(point.y, ymin);
			}
			return {
				x: xmin,
				y: ymin,
				width: xmax - xmin,
				height: ymax - ymin
			};
		},
		
		_drawArrow: function(s, start, end, stroke){
			var len = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)),
				sin = (end.y - start.y)/len, cos = (end.x - start.x)/len,
				point2 = {x: end.x + (len/3)*(-sin), y: end.y + (len/3)*cos},
				point3 = {x: end.x + (len/3)*sin, y: end.y + (len/3)*(-cos)};
			s.createPolyline([start, point2, point3]).setFill(stroke.color).setStroke(stroke);
		},
		
		_buildPoints: function(points, count, circle, radius, angle, recursive){
			for (var i = 0; i < count; i++) {
				var end = angle + 2 * Math.PI * i / count;
				points.push(this._getCoordinate(circle, radius, end));
			}
			if(recursive){
				points.push(this._getCoordinate(circle, radius, angle + 2 * Math.PI));
			}
		},
		
		_getCoordinate: function(circle, radius, angle){
			return {
				x: circle.cx + radius * Math.cos(angle),
				y: circle.cy + radius * Math.sin(angle)
			}
		},
		
		_getObjectLength: function(obj){
			var count = 0;
			if(lang.isObject(obj)){
				for(var key in obj){
					count++;
				}
			}
			return count;
		},

		// utilities
		_getLabel: function(number){
			return dc.getLabel(number, this.opt.fixed, this.opt.precision);
		}
	});
	
	function transColor(color){
		var a = new dxcolor.Color(color),
			x = a.toHsl();
		if(x.s == 0){
			x.l = x.l < 50 ? 100 : 0;
		}else{
			x.s = 100;
			if(x.l < 50){
				x.l = 75;
			}else if(x.l > 75){
				x.l = 50;
			}else{
				x.l = x.l - 50 > 75 - x.l ?
					50 : 75;
			}
		}
		var color = dxcolor.fromHsl(x);
		color.a = 0.7;
		return color;
	}
	
	return Spider; // dojox.plot2d.Spider
});
