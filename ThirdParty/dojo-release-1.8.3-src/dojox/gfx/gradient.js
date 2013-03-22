define(["dojo/_base/lang", "./matrix", "dojo/_base/Color"], 
  function(lang, m, Color){
// Various utilities to deal with a linear gradient (mostly VML-specific)
	var grad = lang.getObject("dojox.gfx.gradient", true);
	var C = Color;
	
	grad.rescale = function(stops, from, to){
		// summary:
		//		Recalculates a gradient from 0-1 window to
		//		"from"-"to" window blending and replicating colors,
		//		if necessary.
		// stops: Array
		//		input gradient as a list of colors with offsets
		//		(see dojox/gfx.defaultLinearGradient and dojox/gfx.defaultRadialGradient)
		// from: Number
		//		the beginning of the window, should be less than "to"
		// to: Number
		//		the end of the window, should be more than "from"

		var len = stops.length, reverseFlag = (to < from), newStops;

		// do we need to reverse the color table?
		if(reverseFlag){
			var tmp = from;
			from = to;
			to = tmp;
		}
		
		// various edge cases
		if(!len){
			// no colors
			return [];
		}
		if(to <= stops[0].offset){
			// all colors are before the color table
			newStops = [
				{offset: 0, color: stops[0].color},
				{offset: 1, color: stops[0].color}
			];
		}else if(from >= stops[len - 1].offset){
			// all colors are after the color table
			newStops = [
				{offset: 0, color: stops[len - 1].color},
				{offset: 1, color: stops[len - 1].color}
			];
		}else{
			// main scanning algorithm
			var span = to - from, stop, prev, i;
			newStops = [];
			if(from < 0){
				newStops.push({offset: 0, color: new C(stops[0].color)});
			}
			for(i = 0; i < len; ++i){
				stop = stops[i];
				if(stop.offset >= from){
					break;
				}
				// skip this color
			}
			if(i){
				prev = stops[i - 1];
				newStops.push({
					offset: 0,
					color: Color.blendColors(new C(prev.color), new C(stop.color), (from - prev.offset) / (stop.offset - prev.offset))
				});
			}else{
				newStops.push({offset: 0, color: new C(stop.color)});
			}
			for(; i < len; ++i){
				stop = stops[i];
				if(stop.offset >= to){
					break;
				}
				newStops.push({offset: (stop.offset - from) / span, color: new C(stop.color)});
			}
			if(i < len){
				prev = stops[i - 1];
				newStops.push({
					offset: 1,
					color: Color.blendColors(new C(prev.color), new C(stop.color), (to - prev.offset) / (stop.offset - prev.offset))
				});
			}else{
				newStops.push({offset: 1, color: new C(stops[len - 1].color)});
			}
		}
		
		// reverse the color table, if needed
		if(reverseFlag){
			newStops.reverse();
			for(i = 0, len = newStops.length; i < len; ++i){
				stop = newStops[i];
				stop.offset = 1 - stop.offset;
			}
		}
		
		return newStops;
	};
	
	function getPoint(x, y, matrix, project, shiftAndRotate, scale){
		var r = m.multiplyPoint(matrix, x, y),
			p = m.multiplyPoint(project, r);
		return {r: r, p: p, o: m.multiplyPoint(shiftAndRotate, p).x / scale};
	}
	
	function sortPoints(a, b){
		return a.o - b.o;
	}
	
	grad.project = function(matrix, gradient, tl, rb, ttl, trb){
		// summary:
		//		Returns a new gradient using the "VML algorithm" and suitable for VML.
		// matrix: dojox/gfx/matrix.Matrix2D|null
		//		matrix to apply to a shape and its gradient
		// gradient: Object
		//		a linear gradient object to be transformed
		// tl: dojox/gfx.Point
		//		top-left corner of shape's bounding box
		// rb: dojox/gfx.Point
		//		right-bottom corner of shape's bounding box
		// ttl: dojox/gfx.Point
		//		top-left corner of shape's transformed bounding box
		// trb: dojox/gfx.Point
		//		right-bottom corner of shape's transformed bounding box
		
		matrix = matrix || m.identity;

		var f1 = m.multiplyPoint(matrix, gradient.x1, gradient.y1),
			f2 = m.multiplyPoint(matrix, gradient.x2, gradient.y2),
			angle = Math.atan2(f2.y - f1.y, f2.x - f1.x),
			project = m.project(f2.x - f1.x, f2.y - f1.y),
			pf1 = m.multiplyPoint(project, f1),
			pf2 = m.multiplyPoint(project, f2),
			shiftAndRotate = new m.Matrix2D([m.rotate(-angle), {dx: -pf1.x, dy: -pf1.y}]),
			scale = m.multiplyPoint(shiftAndRotate, pf2).x,
			//comboMatrix = new m.Matrix2D([shiftAndRotate, project, matrix]),
			// bbox-specific calculations
			points = [
					getPoint(tl.x, tl.y, matrix, project, shiftAndRotate, scale),
					getPoint(rb.x, rb.y, matrix, project, shiftAndRotate, scale),
					getPoint(tl.x, rb.y, matrix, project, shiftAndRotate, scale),
					getPoint(rb.x, tl.y, matrix, project, shiftAndRotate, scale)
				].sort(sortPoints),
			from = points[0].o,
			to   = points[3].o,
			stops = grad.rescale(gradient.colors, from, to),
			//angle2 = Math.atan2(Math.abs(points[3].r.y - points[0].r.y) * (f2.y - f1.y), Math.abs(points[3].r.x - points[0].r.x) * (f2.x - f1.x));
			angle2 = Math.atan2(points[3].r.y - points[0].r.y, points[3].r.x - points[0].r.x);

		return {
			type: "linear",
			x1: points[0].p.x, y1: points[0].p.y, x2: points[3].p.x, y2: points[3].p.y,
			colors: stops,
			// additional helpers (for VML)
			angle: angle
		};
	};
	
	return grad;
});
