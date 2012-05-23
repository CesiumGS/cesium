define(["dojo/_base/array", "dojo/_base/declare", "dojo/_base/Deferred"], 
  function(arr, declare, Deferred){
	
	return declare("dojox.charting.StoreSeries", null, {
		constructor: function(store, kwArgs, value){
			//	summary:
			//		Series adapter for dojo object stores (dojo.store).
			//	store: Object:
			//		A dojo object store.
			//	kwArgs: Object:
			//		A store-specific keyword parameters used for querying objects.
			//		See dojo.store docs
			//	value: Function|Object|String|Null:
			//		Function, which takes an object handle, and
			//		produces an output possibly inspecting the store's item. Or
			//		a dictionary object, which tells what names to extract from
			//		an object and how to map them to an output. Or a string, which
			//		is a numeric field name to use for plotting. If undefined, null
			//		or empty string (the default), "value" field is extracted.
			this.store = store;
			this.kwArgs = kwArgs;
	
			if(value){
				if(typeof value == "function"){
					this.value = value;
				}else if(typeof value == "object"){
					this.value = function(object){
						var o = {};
						for(var key in value){
							o[key] = object[value[key]];
						}
						return o;
					};
				}else{
					this.value = function(object){
						return object[value];
					};
				}
			}else{
				this.value = function(object){
					return object.value;
				};
			}
	
			this.data = [];
	
			this.fetch();
		},
	
		destroy: function(){
			//	summary:
			//		Clean up before GC.
			if(this.observeHandle){
				this.observeHandle.dismiss();
			}
		},
	
		setSeriesObject: function(series){
			//	summary:
			//		Sets a dojox.charting.Series object we will be working with.
			//	series: dojox.charting.Series:
			//		Our interface to the chart.
			this.series = series;
		},
	
		// store fetch loop
	
		fetch: function(){
			//	summary:
			//		Fetches data from the store and updates a chart.
			var objects = this.objects = [];
			var self = this;
			if(this.observeHandle){
				this.observeHandle.dismiss();
			}
			var results = this.store.query(this.kwArgs.query, this.kwArgs);
			Deferred.when(results, function(objects){
				self.objects = objects;
				update();
			});
			if(results.observe){
				this.observeHandle = results.observe(update, true);
			}
			function update(){
				self.data = arr.map(self.objects, function(object){
					return self.value(object, self.store);
				});
				self._pushDataChanges();
			}
		},
	
		_pushDataChanges: function(){
			if(this.series){
				this.series.chart.updateSeries(this.series.name, this);
				this.series.chart.delayedRender();
			}
		}
	
	});
});
