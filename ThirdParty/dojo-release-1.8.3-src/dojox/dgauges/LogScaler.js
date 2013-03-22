define(["dojo/_base/lang", "dojo/_base/declare", "dojo/Stateful"], function(lang, declare, Stateful){
	return declare("dojox.dgauges.LogScaler", Stateful, {
		// summary:
		//		The LogScaler maps numeric values evenly
		//		between a minimum and a maximum value along a gauge scale.
		//		If no multiplier is specified, the scale will place
		//		a tick on each power of 10 value (1, 10, 100, 1000, and so on) between
		//		the minimum and maximum values.
		
		// minimum: Number
		//		The minimum value of the scaler. Default is 0.
		minimum: 0,
		// maximum: Number
		//		The maximum value of the scaler. Default is 1000.
		maximum: 1000,
		// multiplier: Number
		//		The interval between two major ticks.
		multiplier: 10,
		// majorTicks:
		//		The array of generated major ticks. You should not set this
		//		property when using the scaler.
		majorTicks: null,
		
		_computedMultiplier: NaN,
		
		constructor: function(){
			this.watchedProperties = ["minimum", "maximum", "multiplier"];
		},
		_buildMajorTickItems: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			var majorTickCache = [];
			this._computedMinimum = this.getComputedMinimum();
			this._computedMaximum = this.getComputedMaximum();
			this._computedMultiplier = this.getComputedMultiplier();
			
			if(this._computedMaximum > this._computedMinimum){
				var start = Math.max(0, Math.floor(Math.log(this._computedMinimum + 0.000000001) / Math.LN10));
				var end = Math.max(0, Math.floor(Math.log(this._computedMaximum + 0.000000001) / Math.LN10));
				var data;
				for(var i = start; i <= end; i += this._computedMultiplier){
					data = {};
					data.value = Math.pow(10, i);
					data.position = (i - start) / (end - start);
					majorTickCache.push(data);
				}
			}
			return majorTickCache;
		},
		
		getComputedMinimum: function(){
			// summary:
			//		The computed minimum value of the scale. If the minimum value is not
			//		an even power of 10, the scale computes a new minimum so that it maps to 
			//		an even power of 10.
			return Math.pow(10, Math.max(0, Math.floor(Math.log(this.minimum + 0.000000001) / Math.LN10)));
		},
		
		getComputedMaximum: function(){
			// summary:
			//		The computed maximum value of the scale. If the maximum value is not
			//		an even power of 10, the scale computes a new maximum so that it maps to 
			//		an even power of 10.
			return Math.pow(10, Math.max(0, Math.floor(Math.log(this.maximum + 0.000000001) / Math.LN10)));
		},
		
		
		getComputedMultiplier: function(){
			// summary:
			//		The computed multiplier value of the scale. If the multiplier value is not
			//		an even power of 10, the scale computes a new multiplier so that it maps to 
			//		an even power of 10.
			return Math.max(1, Math.floor(Math.log(this.multiplier + 0.000000001) / Math.LN10));
			
		},
		
		computeTicks: function(){
			// summary:
			//		Creates or re-creates the ticks for this scaler.
			// returns: Array
			//		An array containing ticks.
			this.majorTicks = this._buildMajorTickItems();
			return this.majorTicks.concat();
		},
		
		positionForValue: function(value){
			// summary:
			//		Transforms a value into a relative position between 0 and 1.
			// value: Number
			//		A value to transform.
			// returns: Number
			//		The position between 0 and 1.
			
			if(this._computedMaximum < this._computedMinimum || value <= this._computedMinimum || value < 1 || isNaN(value)){
				value = this._computedMinimum;
			}
			if(value >= this._computedMaximum){
				value = this._computedMaximum;
			}
			value = Math.log(value) / Math.LN10;
			var sv = Math.log(this._computedMinimum) / Math.LN10;
			var ev = Math.log(this._computedMaximum) / Math.LN10;
			return (value - sv) / (ev - sv);
		},
		
		valueForPosition: function(position){
			// summary:
			//		Transforms a relative position (between 0 and 1) into a value.
			// position: Number
			//		A relative position to transform.
			// returns: Number
			//		The transformed value between minimum and maximum.
			var sv = Math.log(this._computedMinimum) / Math.LN10;
			var ev = Math.log(this._computedMaximum) / Math.LN10;
			return Math.pow(10, sv + position * (ev - sv));
		}
	});
});
