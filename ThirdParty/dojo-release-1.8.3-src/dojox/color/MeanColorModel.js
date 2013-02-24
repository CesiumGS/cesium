define(["dojo/_base/array", "dojo/_base/declare", "./NeutralColorModel"],
	function(arr, declare, NeutralColorModel){
	
	return declare("dojox.color.MeanColorModel", NeutralColorModel, {
		// summary:
		//		A color model that returns a color from a data value
		//		using an interpolation between two extremum colors around the mean value.
			
		constructor: function(startColor, endColor){
			// startColor: dojo/_base/Color
			//		The start color.
			// endColor: dojo/_base/Color?
			//		The end color.
		},
			
		computeNeutral: function(min, max, sum, values){
			// summary:
			//		Return the neutral value in this case the mean value of the data values.
			// min: Number
			//		The minimal value.
			// max: Number
			//		The maximum value.
			// sum: Number
			//		The sum of all values.
			// values: Number[]
			//		The sorted array of values used to compute colors.			
			var median = min;
			if(values.length != 0){
				if(values.length < 3){
					median = sum / values.length;
				}else if((values.length & 1) == 0){
					median = (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
				}else{
					median = values[Math.floor(values.length / 2)];
				}
			}
			return median;
		}
	});
});
