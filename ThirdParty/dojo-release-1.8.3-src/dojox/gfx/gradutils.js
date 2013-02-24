// Various generic utilities to deal with a linear gradient

define(["./_base", "dojo/_base/lang", "./matrix", "dojo/_base/Color"], 
  function(g, lang, m, Color){
  
	var gradutils = g.gradutils = {};

	function findColor(o, c){
		if(o <= 0){
			return c[0].color;
		}
		var len = c.length;
		if(o >= 1){
			return c[len - 1].color;
		}
		//TODO: use binary search
		for(var i = 0; i < len; ++i){
			var stop = c[i];
			if(stop.offset >= o){
				if(i){
					var prev = c[i - 1];
					return Color.blendColors(new Color(prev.color), new Color(stop.color),
						(o - prev.offset) / (stop.offset - prev.offset));
				}
				return stop.color;
			}
		}
		return c[len - 1].color;
	}

	gradutils.getColor = function(fill, pt){
		// summary:
		//		sample a color from a gradient using a point
		// fill: Object
		//		fill object
		// pt: dojox/gfx.Point
		//		point where to sample a color
		var o;
		if(fill){
			switch(fill.type){
				case "linear":
					var angle = Math.atan2(fill.y2 - fill.y1, fill.x2 - fill.x1),
						rotation = m.rotate(-angle),
						projection = m.project(fill.x2 - fill.x1, fill.y2 - fill.y1),
						p = m.multiplyPoint(projection, pt),
						pf1 = m.multiplyPoint(projection, fill.x1, fill.y1),
						pf2 = m.multiplyPoint(projection, fill.x2, fill.y2),
						scale = m.multiplyPoint(rotation, pf2.x - pf1.x, pf2.y - pf1.y).x;
					o = m.multiplyPoint(rotation, p.x - pf1.x, p.y - pf1.y).x / scale;
					break;
				case "radial":
					var dx = pt.x - fill.cx, dy = pt.y - fill.cy;
					o = Math.sqrt(dx * dx + dy * dy) / fill.r;
					break;
			}
			return findColor(o, fill.colors);	// dojo/_base/Color
		}
		// simple color
		return new Color(fill || [0, 0, 0, 0]);	// dojo/_base/Color
	};

	gradutils.reverse = function(fill){
		// summary:
		//		reverses a gradient
		// fill: Object
		//		fill object
		if(fill){
			switch(fill.type){
				case "linear":
				case "radial":
					fill = lang.delegate(fill);
					if(fill.colors){
						var c = fill.colors, l = c.length, i = 0, stop,
							n = fill.colors = new Array(c.length);
						for(; i < l; ++i){
							stop = c[i];
							n[i] = {
								offset: 1 - stop.offset,
								color:  stop.color
							};
						}
						n.sort(function(a, b){ return a.offset - b.offset; });
					}
					break;
			}
		}
		return fill;	// Object
	};

	return gradutils;
});
