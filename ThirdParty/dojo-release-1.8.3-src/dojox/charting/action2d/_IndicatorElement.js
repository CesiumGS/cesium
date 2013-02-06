define(["dojo/_base/lang", "dojo/_base/declare", "../plot2d/Base", "../plot2d/common",
    "../axis2d/common", "dojox/gfx"], 
	function(lang, declare, Base, dcpc, dcac, gfx){

	// all the code below should be removed when http://trac.dojotoolkit.org/ticket/11299 will be available
	var getBoundingBox = function(shape){
		return getTextBBox(shape, shape.getShape().text);
	};
	var getTextBBox = function(s, t){
		var c = s.declaredClass;
		var w, h;
		if (c.indexOf("svg")!=-1){
			// try/catch the FF native getBBox error. cheaper than walking up in the DOM
			// hierarchy to check the conditions (bench show /10 )
			try {
				return lang.mixin({}, s.rawNode.getBBox());
			}catch (e){
				return null;
			}
		}else if(c.indexOf("vml")!=-1){
			var rawNode = s.rawNode, _display = rawNode.style.display;
			rawNode.style.display = "inline";
			w = gfx.pt2px(parseFloat(rawNode.currentStyle.width));
			h = gfx.pt2px(parseFloat(rawNode.currentStyle.height));
			var sz = {x: 0, y: 0, width: w, height: h};
			// in VML, the width/height we get are in view coordinates
			// in our case we don't zoom the view so that is ok
			// It's impossible to get the x/y from the currentStyle.left/top,
			// because all negative coordinates are 'clipped' to 0.
			// (x:0 + translate(-100) -> x=0
			computeLocation(s, sz);
			rawNode.style.display = _display;
			return sz;
		}else if(c.indexOf("silverlight")!=-1){
			var bb = {width: s.rawNode.actualWidth, height: s.rawNode.actualHeight};
			return computeLocation(s, bb, 0.75);
		}else if(s.getTextWidth){
			// canvas
			w = s.getTextWidth();
			var font = s.getFont();
			var fz = font ? font.size : gfx.defaultFont.size;
			h = gfx.normalizedLength(fz);
			sz = {width: w, height: h};
			computeLocation(s, sz, 0.75);
			return sz;
		}
		return null;
	};
	var computeLocation =  function(s, sz, coef){
		var width = sz.width, height = sz.height, sh = s.getShape(), align = sh.align;
		switch (align) {
		case "end":
			sz.x = sh.x - width;
			break;
		case "middle":
			sz.x = sh.x - width / 2;
			break;
		case "start":
		default:
			sz.x = sh.x;
		break;
		}
		coef = coef || 1;
		sz.y = sh.y - height*coef; // rough approximation of the ascent!...
		return sz;
	};

	return declare(Base, {
		// summary:
		//		Internal element used by indicator actions.
		// tags:
		//		private
		constructor: function(chart, kwArgs){
			if(!kwArgs){ kwArgs = {}; }
			this.inter = kwArgs.inter;
		},
		_updateVisibility: function(cp, limit, attr){
			var axis = attr=="x"?this.inter.plot._hAxis:this.inter.plot._vAxis;
			var scale = axis.getWindowScale();
			this.chart.setAxisWindow(axis.name, scale, axis.getWindowOffset() + (cp[attr] - limit[attr]) / scale);
			this._noDirty = true;
			this.chart.render();
			this._noDirty = false;
			if(!this._tracker){
				this.initTrack();
			}
		},
		_trackMove: function(){
			// let's update the selector
			this._updateIndicator(this.pageCoord);
			// if we reached that point once, then we don't stop until mouse up
			if(this._initTrackPhase){
				this._initTrackPhase = false;
				this._tracker = setInterval(lang.hitch(this, this._trackMove), 100);
			}
		},
		initTrack: function(){
			this._initTrackPhase = true;
			this._tracker = setTimeout(lang.hitch(this, this._trackMove), 500);
		},
		stopTrack: function(){
			if(this._tracker){
				if(this._initTrackPhase){
					clearTimeout(this._tracker);					
				}else{
					clearInterval(this._tracker);
				}
				this._tracker = null;
			}
		},
		render: function(){
			if(!this.isDirty()){
				return;
			}

			this.cleanGroup();

			if (!this.pageCoord){
				return;
			}
			
			this._updateIndicator(this.pageCoord, this.secondCoord);
		},
		_updateIndicator: function(cp1, cp2){
			var inter = this.inter, plot = inter.plot, v = inter.opt.vertical;
			var hAxis = this.chart.getAxis(plot.hAxis), vAxis = this.chart.getAxis(plot.vAxis);
			var hn = hAxis.name, vn = vAxis.name, hb = hAxis.getScaler().bounds, vb = vAxis.getScaler().bounds;
			var attr = v?"x":"y", n = v?hn:vn, bounds = v?hb:vb;
			
			// sort data point
			if(cp2){
				var tmp;
				if(v){
					if(cp1.x>cp2.x){
						tmp = cp2;
						cp2 = cp1;
						cp1 = tmp;
					}
				}else{
					if(cp1.y>cp2.y){
						tmp = cp2;
						cp2 = cp1;
						cp1 = tmp;
					}		
				}
			}

			var cd1 = plot.toData(cp1), cd2;
			if(cp2){
				cd2 = plot.toData(cp2);
			}
			
			var o = {};
			o[hn] = hb.from;
			o[vn] = vb.from;
			var min = plot.toPage(o);
			o[hn] = hb.to;
			o[vn] = vb.to;
			var max = plot.toPage(o);
			
			if(cd1[n] < bounds.from){
				// do not autoscroll if dual indicator
				if(!cd2 && inter.opt.autoScroll){
					this._updateVisibility(cp1, min, attr);
					return;
				}else{
					cp1[attr] = min[attr];
				}
				// cp1 might have changed, let's update cd1
				cd1 = plot.toData(cp1);
			}else if(cd1[n] > bounds.to){
				if(!cd2 && inter.opt.autoScroll){
					this._updateVisibility(cp1, max, attr);
					return;
				}else{
					cp1[attr] = max[attr];
				}
				// cp1 might have changed, let's update cd1
				cd1 = plot.toData(cp1);
			}	
			
			var c1 = this._getData(cd1, attr, v), c2;

			if(c1.y == null){
				// we have no data for that point let's just return
				return;
			}

			if(cp2){
				if(cd2[n] < bounds.from){
					cp2[attr] = min[attr];
					cd2 = plot.toData(cp2);
				}else if(cd2[n] > bounds.to){
					cp2[attr] = max[attr];
					cd2 = plot.toData(cp2);	
				}
				c2 = this._getData(cd2, attr, v);
				if(c2.y == null){
					// we have no data for that point let's pretend we have a single touch point
					cp2 = null;
				}
			}
			
			var t1 = this._renderIndicator(c1, cp2?1:0, hn, vn, min, max);
			if(cp2){
				var t2 = this._renderIndicator(c2, 2, hn, vn, min, max);
				var delta = v?c2.y-c1.y:c2.x-c1.y;
				var text = inter.opt.labelFunc?inter.opt.labelFunc(c1, c2, inter.opt.fixed, inter.opt.precision):
					(dcpc.getLabel(delta, inter.opt.fixed, inter.opt.precision)+" ("+dcpc.getLabel(100*delta/(v?c1.y:c1.x), true, 2)+"%)");
				this._renderText(text, inter, this.chart.theme, v?(t1.x+t2.x)/2:t1.x, v?t1.y:(t1.y+t2.y)/2, c1, c2);
			}
			
		},
		_renderIndicator: function(coord, index, hn, vn, min, max){
			var t = this.chart.theme, c = this.chart.getCoords(), inter = this.inter, plot = inter.plot, v = inter.opt.vertical;
			
			var mark = {};
			mark[hn] = coord.x;
			mark[vn] = coord.y;
			mark = plot.toPage(mark);

			var cx = mark.x - c.x, cy = mark.y - c.y;
			var x1 = v?cx:min.x - c.x, y1 = v?min.y - c.y:cy, x2 = v?x1:max.x - c.x, y2 = v?max.y - c.y:y1;
			var sh = inter.opt.lineShadow?inter.opt.lineShadow:t.indicator.lineShadow,
				ls = inter.opt.lineStroke?inter.opt.lineStroke:t.indicator.lineStroke,
				ol = inter.opt.lineOutline?inter.opt.lineOutline:t.indicator.lineOutline;
			if(sh){
				this.group.createLine({x1: x1 + sh.dx, y1: y1 + sh.dy, x2: x2 + sh.dx, y2: y2 + sh.dy}).setStroke(sh);
			}
			if(ol){
				ol = dcpc.makeStroke(ol);
				ol.width = 2 * ol.width + ls.width;
				this.group.createLine({x1: x1, y1: y1, x2: x2, y2: y2}).setStroke(ol);
			}
			this.group.createLine({x1: x1, y1: y1, x2: x2, y2: y2}).setStroke(ls);

			var ms = inter.opt.markerSymbol?inter.opt.markerSymbol:t.indicator.markerSymbol,
					path = "M" + cx + " " + cy + " " + ms;
			sh = inter.opt.markerShadow?inter.opt.markerShadow:t.indicator.markerShadow;
			ls = inter.opt.markerStroke?inter.opt.markerStroke:t.indicator.markerStroke;
			ol = inter.opt.markerOutline?inter.opt.markerOutline:t.indicator.markerOutline;
			if(sh){
				var sp = "M" + (cx + sh.dx) + " " + (cy + sh.dy) + " " + ms;
				this.group.createPath(sp).setFill(sh.color).setStroke(sh);
			}
			if(ol){
				ol = dcpc.makeStroke(ol);
				ol.width = 2 * ol.width + ls.width;
				this.group.createPath(path).setStroke(ol);
			}

			var shape = this.group.createPath(path);
			var sf = this._shapeFill(inter.opt.markerFill?inter.opt.markerFill:t.indicator.markerFill, shape.getBoundingBox());
			shape.setFill(sf).setStroke(ls);

			if(index==0){
				var text = inter.opt.labelFunc?inter.opt.labelFunc(coord, null, inter.opt.fixed, inter.opt.precision):
					dcpc.getLabel(v?coord.y:coord.x, inter.opt.fixed, inter.opt.precision);
				this._renderText(text, inter, t, v?x1:x2+5, v?y2+5:y1, coord);
			}
			return v?{x: x1, y: y2+5}:{x: x2+5, y: y1};
		},
		_renderText: function(text, inter, t, x, y, c1, c2){
			var label = dcac.createText.gfx(
					this.chart,
					this.group,
					x, y,
					"middle",
					text, inter.opt.font?inter.opt.font:t.indicator.font, inter.opt.fontColor?inter.opt.fontColor:t.indicator.fontColor);
			var b = getBoundingBox(label);
			b.x-=2; b.y-=1; b.width+=4; b.height+=2; b.r = inter.opt.radius?inter.opt.radius:t.indicator.radius;
			var sh = inter.opt.shadow?inter.opt.shadow:t.indicator.shadow,
				ls = inter.opt.stroke?inter.opt.stroke:t.indicator.stroke,
				ol = inter.opt.outline?inter.opt.outline:t.indicator.outline;
			if(sh){
				this.group.createRect(b).setFill(sh.color).setStroke(sh);
			}
			if(ol){
				ol = dcpc.makeStroke(ol);
				ol.width = 2 * ol.width + ls.width;
				this.group.createRect(b).setStroke(ol);
			}
			var f = inter.opt.fillFunc?inter.opt.fillFunc(c1, c2):(inter.opt.fill?inter.opt.fill:t.indicator.fill);
			this.group.createRect(b).setFill(this._shapeFill(f, b)).setStroke(ls);
			label.moveToFront();
		},
		_getData: function(cd, attr, v){
			// we need to find which actual data point is "close" to the data value
			var data = this.chart.getSeries(this.inter.opt.series).data;
			// let's consider data are sorted because anyway rendering will be "weird" with unsorted data
			// i is an index in the array, which is different from a x-axis value even for index based data
			var i, r, l = data.length;
			for (i = 0; i < l; ++i){
				r = data[i];
				if(r == null){
					// move to next item
				}else if(typeof r == "number"){
					if(i + 1 > cd[attr]){
						break;
					}
				}else if(r[attr] > cd[attr]){
					break;
				}
			}
			var x,y,px,py;
			if(typeof r == "number"){
				x = i+1;
				y = r;
				if(i>0){
					px = i;
					py = data[i-1];
				}
			}else{
				x = r.x;
				y = r.y;
				if(i>0){
					px = data[i-1].x;
					py = data[i-1].y;
				}
			}
			if(i>0){
				var m = v?(x+px)/2:(y+py)/2;
				if(cd[attr]<=m){
					x = px;
					y = py;
				}
			}
			return {x: x, y: y};
		},
		cleanGroup: function(creator){
			// summary:
			//		Clean any elements (HTML or GFX-based) out of our group, and create a new one.
			// creator: dojox/gfx/Surface?
			//		An optional surface to work with.
			// returns: dojox/charting/Element
			//		A reference to this object for functional chaining.
			this.inherited(arguments);
			// we always want to be above regular plots and not clipped
			this.group.moveToFront();
			return this;	//	dojox/charting/Element
		},
		getSeriesStats: function(){
			// summary:
			//		Returns default stats (irrelevant for this type of plot).
			// returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			return lang.delegate(dcpc.defaultStats);
		},
		isDirty: function(){
			// summary:
			//		Return whether or not this plot needs to be redrawn.
			// returns: Boolean
			//		If this plot needs to be rendered, this will return true.
			return !this._noDirty && (this.dirty || this.inter.plot.isDirty());
		}
	});
});
