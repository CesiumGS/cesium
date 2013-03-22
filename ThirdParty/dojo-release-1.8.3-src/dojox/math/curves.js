// AMD-ID "dojox/math/curves"
define(["dojo", "dojox"], function(dojo, dojox) {
dojo.getObject("math.curves", true, dojox);

dojo.mixin(dojox.math.curves, {
	Line:function (start, end) {
		this.start = start;
		this.end = end;
		this.dimensions = start.length;
		for (var i = 0; i < start.length; i++) {
			start[i] = Number(start[i]);
		}
		for (var i = 0; i < end.length; i++) {
			end[i] = Number(end[i]);
		}
		this.getValue = function (n) {
			var retVal = new Array(this.dimensions);
			for (var i = 0; i < this.dimensions; i++) {
				retVal[i] = ((this.end[i] - this.start[i]) * n) + this.start[i];
			}
			return retVal;
		};
		return this;
	},
	Bezier:function(pnts) {
		this.getValue = function (step) {
			if (step >= 1) {
				return this.p[this.p.length - 1];
			}
			if (step <= 0) {
				return this.p[0];
			}
			var retVal = new Array(this.p[0].length);
			for (var k = 0; j < this.p[0].length; k++) {
				retVal[k] = 0;
			}
			for (var j = 0; j < this.p[0].length; j++) {
				var C = 0;
				var D = 0;
				for (var i = 0; i < this.p.length; i++) {
					C += this.p[i][j] * this.p[this.p.length - 1][0] * dojox.math.bernstein(step, this.p.length, i);
				}
				for (var l = 0; l < this.p.length; l++) {
					D += this.p[this.p.length - 1][0] * dojox.math.bernstein(step, this.p.length, l);
				}
				retVal[j] = C / D;
			}
			return retVal;
		};
		this.p = pnts;
		return this;
	},
	CatmullRom:function (pnts, c) {
		this.getValue = function (step) {
			var percent = step * (this.p.length - 1);
			var node = Math.floor(percent);
			var progress = percent - node;
			var i0 = node - 1;
			if (i0 < 0) {
				i0 = 0;
			}
			var i = node;
			var i1 = node + 1;
			if (i1 >= this.p.length) {
				i1 = this.p.length - 1;
			}
			var i2 = node + 2;
			if (i2 >= this.p.length) {
				i2 = this.p.length - 1;
			}
			var u = progress;
			var u2 = progress * progress;
			var u3 = progress * progress * progress;
			var retVal = new Array(this.p[0].length);
			for (var k = 0; k < this.p[0].length; k++) {
				var x1 = (-this.c * this.p[i0][k]) + ((2 - this.c) * this.p[i][k]) + ((this.c - 2) * this.p[i1][k]) + (this.c * this.p[i2][k]);
				var x2 = (2 * this.c * this.p[i0][k]) + ((this.c - 3) * this.p[i][k]) + ((3 - 2 * this.c) * this.p[i1][k]) + (-this.c * this.p[i2][k]);
				var x3 = (-this.c * this.p[i0][k]) + (this.c * this.p[i1][k]);
				var x4 = this.p[i][k];
				retVal[k] = x1 * u3 + x2 * u2 + x3 * u + x4;
			}
			return retVal;
		};
		if (!c) {
			this.c = 0.7;
		} else {
			this.c = c;
		}
		this.p = pnts;
		return this;
	},
	Arc:function (start, end, ccw){
		function translate(a,b){
			var c=new Array(a.length);
			for(var i=0; i<a.length; i++){ c[i]=a[i]+b[i]; }
			return c;
		}
		function invert(a){
			var b = new Array(a.length);
			for(var i=0; i<a.length; i++){ b[i]=-a[i]; }
			return b;
		}
		var center = dojox.math.midpoint(start, end);
		var sides = translate(invert(center), start);
		var rad = Math.sqrt(Math.pow(sides[0], 2) + Math.pow(sides[1], 2));
		var theta = dojox.math.radiansToDegrees(Math.atan(sides[1] / sides[0]));
		if (sides[0] < 0){
			theta -= 90;
		} else {
			theta += 90;
		}
		dojox.math.curves.CenteredArc.call(this, center, rad, theta, theta + (ccw ? -180 : 180));
	},
	CenteredArc:function (center, radius, start, end) {
		this.center = center;
		this.radius = radius;
		this.start = start || 0;
		this.end = end;
		this.getValue = function (n) {
			var retVal = new Array(2);
			var theta = dojox.math.degreesToRadians(this.start + ((this.end - this.start) * n));
			retVal[0] = this.center[0] + this.radius * Math.sin(theta);
			retVal[1] = this.center[1] - this.radius * Math.cos(theta);
			return retVal;
		};
		return this;
	},
	Circle:function(center, radius){
		dojox.math.curves.CenteredArc.call(this, center, radius, 0, 360);
		return this;
	},
	Path:function () {
		var curves = [];
		var weights = [];
		var ranges = [];
		var totalWeight = 0;
		this.add = function (curve, weight) {
			if (weight < 0) {
				console.error("dojox.math.curves.Path.add: weight cannot be less than 0");
			}
			curves.push(curve);
			weights.push(weight);
			totalWeight += weight;
			computeRanges();
		};
		this.remove = function (curve) {
			for (var i = 0; i < curves.length; i++) {
				if (curves[i] == curve) {
					curves.splice(i, 1);
					totalWeight -= weights.splice(i, 1)[0];
					break;
				}
			}
			computeRanges();
		};
		this.removeAll = function () {
			curves = [];
			weights = [];
			totalWeight = 0;
		};
		this.getValue = function (n) {
			var found = false, value = 0;
			for (var i = 0; i < ranges.length; i++) {
				var r = ranges[i];
				if (n >= r[0] && n < r[1]) {
					var subN = (n - r[0]) / r[2];
					value = curves[i].getValue(subN);
					found = true;
					break;
				}
			}
			if (!found) {
				value = curves[curves.length - 1].getValue(1);
			}
			for (var j = 0; j < i; j++) {
				value = dojox.math.points.translate(value, curves[j].getValue(1));
			}
			return value;
		};
		function computeRanges() {
			var start = 0;
			for (var i = 0; i < weights.length; i++) {
				var end = start + weights[i] / totalWeight;
				var len = end - start;
				ranges[i] = [start, end, len];
				start = end;
			}
		}
		return this;
	}
});

return dojox.math.curves;
});
