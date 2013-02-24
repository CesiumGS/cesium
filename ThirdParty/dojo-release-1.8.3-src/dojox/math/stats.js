// AMD-ID "dojox/math/stats"
define(["dojo", "../main"], function(dojo, dojox) {
	
	dojo.getObject("math.stats", true, dojox);

	var st = dojox.math.stats;
	dojo.mixin(st, {
		sd: function(/* Number[] */a){
			// summary:
			//		Returns the standard deviation of the passed arguments.
			return Math.sqrt(st.variance(a));	// Number
		},

		variance: function(/* Number[] */a){
			// summary:
			//		Find the variance in the passed array of numbers.
			var mean=0, squares=0;
			dojo.forEach(a, function(item){
				mean+=item;
				squares+=Math.pow(item,2);
			});
			return (squares/a.length)-Math.pow(mean/a.length, 2);	// Number
		},

		bestFit: function(/* Object[]|Number[] */ a, /* String? */ xProp, /* String? */ yProp){
			// summary:
			//		Calculate the slope and intercept in a linear fashion.  An array
			//		of objects is expected; optionally you can pass in the property
			//		names for "x" and "y", else x/y is used as the default.  If you
			//		pass an array of numbers, it will be mapped to a set of {x,y} objects
			//		where x = the array index.
			xProp = xProp || "x", yProp = yProp || "y";
			if(a[0] !== undefined && typeof(a[0]) == "number"){
				// this is an array of numbers, so use the index as x.
				a = dojo.map(a, function(item, idx){
					return { x: idx, y: item };
				});
			}

			var sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, stt = 0, sts = 0, n = a.length, t;
			for(var i=0; i<n; i++){
				sx += a[i][xProp];
				sy += a[i][yProp];
				sxx += Math.pow(a[i][xProp], 2);
				syy += Math.pow(a[i][yProp], 2);
				sxy += a[i][xProp] * a[i][yProp];
			}

			// we use the following because it's more efficient and accurate for determining the slope.
			for(i=0; i<n; i++){
				t = a[i][xProp] - sx/n;
				stt += t*t;
				sts += t*a[i][yProp];
			}
			var slope = sts/(stt||1);	// prevent divide by zero.

			// get Pearson's R
			var d = Math.sqrt((sxx - Math.pow(sx,2)/n) * (syy - Math.pow(sy,2)/n));
			if(d === 0){
				throw new Error("dojox.math.stats.bestFit: the denominator for Pearson's R is 0.");
			}

			var r = (sxy-(sx*sy/n)) / d;
			var r2 = Math.pow(r, 2);
			if(slope < 0){
				r = -r;
			}

			// to use:  y = slope*x + intercept;
			return {	// Object
				slope: slope,
				intercept: (sy - sx*slope)/(n||1),
				r: r,
				r2: r2
			};
		},

		forecast: function(/* Object[]|Number[] */a, /* Number */x, /* String? */xProp, /* String? */yProp){
			// summary:
			//		Using the bestFit algorithm above, find y for the given x.
			var fit = st.bestFit(a, xProp, yProp);
			return (fit.slope * x) + fit.intercept;	// Number
		},

		mean: function(/* Number[] */a){
			// summary:
			//		Returns the mean value in the passed array.
			var t=0;
			dojo.forEach(a, function(v){
				t += v;
			});
			return t / Math.max(a.length, 1);	// Number
		},

		min: function(/* Number[] */a){
			// summary:
			//		Returns the min value in the passed array.
			return Math.min.apply(null, a);		// Number
		},

		max: function(/* Number[] */a){
			// summary:
			//		Returns the max value in the passed array.
			return Math.max.apply(null, a);		// Number
		},

		median: function(/* Number[] */a){
			// summary:
			//		Returns the value closest to the middle from a sorted version of the passed array.
			var t = a.slice(0).sort(function(a, b){ return a - b; });
			return (t[Math.floor(a.length/2)] + t[Math.ceil(a.length/2)])/2; // Number
		},

		mode: function(/* Number[] */a){
			// summary:
			//		Returns the mode from the passed array (number that appears the most often).
			//		This is not the most efficient method, since it requires a double scan, but
			//		is ensures accuracy.
			var o = {}, r = 0, m = Number.MIN_VALUE;
			dojo.forEach(a, function(v){
				(o[v]!==undefined)?o[v]++:o[v]=1;
			});

			// we did the lookup map because we need the number that appears the most.
			for(var p in o){
				if(m < o[p]){
					m = o[p], r = p;
				}
			}
			return r;	// Number
		},

		sum: function(/* Number[] */a){
			// summary:
			//		Return the sum of all the numbers in the passed array.  Does
			//		not check to make sure values within a are NaN (should simply
			//		return NaN).
			var sum = 0;
			dojo.forEach(a, function(n){
				sum += n;
			});
			return sum;	// Number
		},

		approxLin: function(a, pos){
			// summary:
			//		Returns a linearly approximated value from an array using
			//		a normalized float position value.
			// a: Number[]
			//		a sorted numeric array to be used for the approximation.
			// pos: Number
			//		a position number from 0 to 1. If outside of this range it
			//		will be clamped.
			// returns: Number
			var p = pos * (a.length - 1), t = Math.ceil(p), f = t - 1;
			if(f < 0){ return a[0]; }
			if(t >= a.length){ return a[a.length - 1]; }
			return a[f] * (t - p) + a[t] * (p - f);	// Number
		},

		summary: function(a, alreadySorted){
			// summary:
			//		Returns a non-parametric collection of summary statistics:
			//		the classic five-number summary extended to the Bowley's
			//		seven-figure summary.
			// a: Number[]
			//		a numeric array to be appraised.
			// alreadySorted: Boolean?
			//		a Boolean flag to indicated that the array is already sorted.
			//		This is an optional flag purely to improve the performance.
			//		If skipped, the array will be assumed unsorted.
			// returns: Object
			if(!alreadySorted){
				a = a.slice(0);								// copy the array
				a.sort(function(a, b){ return a - b; });	// sort it properly
			}
			var	l = st.approxLin,
				result = {
					// the five-number summary
					min:	a[0],				// minimum
					p25:	l(a, 0.25),			// lower quartile
					med:	l(a, 0.5),			// median
					p75:	l(a, 0.75),			// upper quartile
					max:	a[a.length - 1],	// maximum
					// extended to the Bowley's seven-figure summary
					p10:	l(a, 0.1),			// first decile
					p90:	l(a, 0.9)			// last decile
				};
			return result;	// Object
		}
	});

	return dojox.math.stats;
});
