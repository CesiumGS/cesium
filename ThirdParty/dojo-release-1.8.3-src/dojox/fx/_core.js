define(["dojo/_base/lang", "dojo/_base/array","./_base"],
	function(lang, arrayUtil, dojoxFx){

	var line = function(start, end){
		// summary:
		//		a custom _Line to accommodate multi-dimensional values
		// description:
		//		a normal dojo._Line is the curve, and does Line(start,end)
		//		for propertyAnimation. as we make more complicatied animations, we realize
		//		some properties can have 2, or 4 values relevant (x,y) or (t,l,r,b) for example
		//
		//		this function provides support for those Lines, and is ported directly from 0.4
		//		this is a lot of extra code for something so seldom used, so we'll put it here as
		//		and optional core addition. you can create a new line, and use it during onAnimate
		//		as you see fit.
		// start: Integer|Array
		//		An Integer (or an Array of integers) to use as a starting point
		// end: Integer|Array
		//		An Integer (or an Array of integers) to use as an ending point
		// example:
		//		see dojox.fx.smoothScroll
		// example:
		// |	// this is 10 .. 100 and 50 .. 500
		// |	var curve = new dojox.fx._Line([10,50],[100,500]);
		// |	// dojo.Animation.onAnimate is called at every step of the animation
		// |	// to define current values. this _Line returns an array
		// | 	// at each step. arguments[0] and [1] in this example.

		this.start = start;
		this.end = end;

		var isArray = lang.isArray(start),
			d = (isArray ? [] : end - start);

		if(isArray){
			// multi-dimensional branch
			arrayUtil.forEach(this.start, function(s, i){
				d[i] = this.end[i] - s;
			}, this);

			this.getValue = function(/*float*/ n){
				var res = [];
				arrayUtil.forEach(this.start, function(s, i){
					res[i] = (d[i] * n) + s;
				}, this);
				return res; // Array
			}
		}else{
			// single value branch, document here for both branches:
			this.getValue = function(/*float*/ n){
				// summary:
				//		Returns the point on the line, or an array of points
				// n:
				//		a floating point number greater than 0 and less than 1
				// returns: Mixed
				return (d * n) + this.start; // Decimal
			}
		}
	};
	dojoxFx._Line = line; // COMPAT
	return line;
});
