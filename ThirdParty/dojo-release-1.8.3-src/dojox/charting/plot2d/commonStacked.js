define([
	"dojo/_base/lang",
	"./common"
], function(lang, common){
	
	var commonStacked = lang.getObject("dojox.charting.plot2d.commonStacked", true);
	return lang.mixin(commonStacked, {
		collectStats: function(series){
			var stats = lang.delegate(common.defaultStats);
			for(var i = 0; i < series.length; ++i){
				var run = series[i];
				for(var j = 0; j < run.data.length; j++){
					var x, y;
					if(run.data[j] !== null){
						if(typeof run.data[j] == "number" || !run.data[j].hasOwnProperty("x")){
							y = commonStacked.getIndexValue(series, i, j);
							x = j+1;
						}else{
							x = run.data[j].x;
							if(x !== null){
								y = commonStacked.getValue(series, i, x);
								y = y != null && y.y ? y.y:null; 
							}
						}
						stats.hmin = Math.min(stats.hmin, x);
						stats.hmax = Math.max(stats.hmax, x);
						stats.vmin = Math.min(stats.vmin, y);
						stats.vmax = Math.max(stats.vmax, y);
					
					}
				}
			}
			return stats;
		},
		getIndexValue: function(series, i, index){
			var value = 0, v, j;
			for(j = 0; j <= i; ++j){
				v = series[j].data[index];
				if(v != null){
					if(isNaN(v)){ v = v.y || 0; }
					value += v;
				}
			}
			return value;
		},
		
		getValue: function(series, i, x){
			var value = null, j, z;
			for(j = 0; j <= i; ++j){
				for(z = 0; z < series[j].data.length; z++){
					v = series[j].data[z];
					if(v !== null){
						if(v.x == x){
							if(!value){
								value = {x: x};
							}
							if(v.y != null){
								if(value.y == null){
									value.y = 0;
								}
								value.y += v.y;
							}
							break;
						}else if(v.x > x){break;}
					}
				}
			}
			return value;
		}

		
	});
});
