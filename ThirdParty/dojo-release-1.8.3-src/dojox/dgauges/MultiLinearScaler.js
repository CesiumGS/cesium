define(["dojo/_base/declare", "dojo/Stateful"], function(declare, Stateful){
	return declare("dojox.dgauges.MultiLinearScaler", Stateful, {
		// summary:
		//		The multi-linear scaler. This scaler maps numeric values according 
		//		to the majorTickValues content. 
		//		This allows display of very large value intervals that are difficult to render 
		//		with a linear scale. For example, if majorTickValues contains [0, 10, 50, 500, 2000], 
		//		the scale will show five major ticks with these values. 
		//		Note that this is not a logarithmic scale, the interpolation is linear between 
		//		two contiguous major ticks.
		//		Scalers are responsible for tick generation and various data-transform operations.	

		// majorTickValues: Array
		//		An array of Number for creating major ticks.
		//		This array must be sorted in ascendant order.
		majorTickValues: null,
		// minorTickCount: Array
		//		The number of minor ticks between two contiguous major ticks.
		//		The default value is 4.
		minorTickCount: 4,
		// majorTicks:
		//		The array of generated major ticks. You should not set this
		//		property when using the scaler.
		majorTicks: null,
		// minorTicks:
		//		The array of generated minor ticks. You should not set this
		//		property when using the scaler.
		minorTicks: null,
		_snapIntervalPrecision: null,
		_snapCount: 4,
		_snapIntervalPrecision: 6,
		
		constructor: function(){
			this.watchedProperties = ["majorTickValues", "snapCount", "minorTickCount"];
		},
				
		computeTicks: function(){
			// summary:
			//		Creates or re-creates the ticks for this scaler.
			// returns: Array
			//		An array containing all ticks (major then minor ticks).			
			this.majorTicks = [];
			this.minorTicks = [];
			var ti;
			var step = 1 / (this.majorTickValues.length - 1);
			var minorStep = step / (this.minorTickCount + 1);
			var currentIndex = 0;
			var minorInterval;
			var currentMajorValue;
			var v;
			for(var i = 0; i < this.majorTickValues.length; i++){
				v = this.majorTickValues[i];
				ti = {scaler: this};
				ti.position = currentIndex * step;
				ti.value = v;
				ti.isMinor = false;
				this.majorTicks.push(ti);
				if(currentIndex < this.majorTickValues.length - 1){
					currentMajorValue = Number(v);
					minorInterval = (Number(this.majorTickValues[i + 1]) - currentMajorValue) / (this.minorTickCount + 1);
					for(var j = 1; j <= this.minorTickCount; j++){
						ti = {scaler: this};
						ti.isMinor = true;
						ti.position = currentIndex * step + j * minorStep;
						ti.value = currentMajorValue + minorInterval * j;
						this.minorTicks.push(ti);
					}
				}
				currentIndex++;
			}
			return this.majorTicks.concat(this.minorTicks);
		},
		
		positionForValue: function(value){
			// summary:
			//		Transforms a value into a relative position between 0 and 1.
			// value: Number
			//		A value to transform.
			// returns: Number
			//		The position between 0 and 1.			
			if(!this.majorTickValues){
				return 0;
			}
			
			if(!this.majorTicks){
				this.computeTicks();
			}
			
			var minmax = this._getMinMax(value);
			var position = (value - minmax[0].value) / (minmax[1].value - minmax[0].value);
			return minmax[0].position + position * (minmax[1].position - minmax[0].position);
		},
		
		valueForPosition: function(position){
			// summary:
			//		Transforms a relative position (between 0 and 1) into a value.
			// position: Number
			//		A relative position to transform.
			// returns: Number
			//		The transformed value.
			if(this.majorTicks == null){
				return 0;
			}
			var minmax = this._getMinMax(position, "position");
			var value = (position - minmax[0].position) / (minmax[1].position - minmax[0].position);
			return minmax[0].value + value * (minmax[1].value - minmax[0].value);
		},
		
		_getMinMax: function(v, property){
			// summary:
			//		Internal method.
			// tags:
			//		private
			if(!property){
				property = "value";
			}
			var res = [];
			var pre;
			var post;
			var left = 0;
			var right = this.majorTicks.length - 1;
			var center;
			
			if(v <= this.majorTicks[0][property] || v >= this.majorTicks[right][property]){
				res[0] = this.majorTicks[0];
				res[1] = this.majorTicks[right];
				return res;
			}
			
			while (true){
				center = Math.floor((left + right) / 2);
				
				if(this.majorTicks[center][property] <= v){
					if(this.majorTicks[center + 1][property] >= v){
						res[0] = this.majorTicks[center];
						res[1] = this.majorTicks[center + 1];
						return res;
					}else{
						left = center + 1;
						continue;
					}
				}else{
					right = center;
					continue;
				}
			}
		}
	});
});
