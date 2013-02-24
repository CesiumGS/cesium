define(["dojo/_base/array", "dojo/_base/declare", "./SimpleColorModel"],
	function(arr, declare, SimpleColorModel){
	
	return declare("dojox.color.NeutralColorModel", SimpleColorModel, {
		// summary:
		//		Base class for color models that return a color from a data value
		//		using an interpolation between two extremum colors around a neutral value.
		
		_min: 0, 
		_max: 0, 
		_e: 0,
	
		constructor: function(startColor, endColor){
			// startColor: dojo/_base/Color
			//		The start color.
			// endColor: dojo/_base/Color?
			//		The end color.
		},
	
		initialize: function(items, colorFunc){
			// summary:
			//		Initialize the color model from a list of data items and using a function
			//		that returns the value used to compute the color for a given item.
			// items: Object[]
			//		The data items. 
			// colorFunc: Function
			//		The function that returns the value used to compute the color for particular data item.
			var values = [];
			var sum = 0;
			var min = 100000000; 
			var max = -min; 
			arr.forEach(items, function(item){
				var value = colorFunc(item);
				min = Math.min(min, value);
				max = Math.max(max, value);
				sum += value;
				values.push(value);
			});
			values.sort(function(a,b){return a - b;});
			var neutral = this.computeNeutral(min, max, sum, values);
			this._min = min;
			this._max = max;
			if(this._min == this._max || neutral == this._min){
				this._e = -1;
			}else{
				this._e = Math.log(.5) / Math.log((neutral - this._min) / (this._max - this._min));
			}
		},
		
		computeNeutral: function(min, max, sum, values){
			// summary:
			//		Return the neutral value. This can be for example the mean or average value.
			//		This function must be implemented by implementations.
			// min: Number
			//		The minimal value.
			// max: Number
			//		The maximum value.
			// sum: Number
			//		The sum of all values.
			// values: Number[]
			//		The sorted array of values used to compute colors.
		},
		
		getNormalizedValue: function(value){
			// summary:
			//		Return the normalized (between 0 and 1) value for a given data value.
			//		This implementation uses an power function to map neutral value to 0.5
			//		and distribute other values around it.
			// value: Number
			//		The data value			
			if(this._e < 0){
				return 0;
			}
			value = (value - this._min) / (this._max - this._min);
			return Math.pow(value, this._e);
		}
	});

});
