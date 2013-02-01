define(["dojo/_base/lang"], function(lang){

	var eq = function(/*Number*/ a, /*Number*/ b){
		// summary:
		//		compare two FP numbers for equality
		return Math.abs(a - b) <= 1e-6 * (Math.abs(a) + Math.abs(b));	// Boolean
	};
	
	var common = lang.getObject("dojox.charting.scaler.common", true);
	
	var testedModules = {};

	return lang.mixin(common, {
		doIfLoaded: function(moduleName, ifloaded, ifnotloaded){
			if(testedModules[moduleName] == undefined){
				try{
					testedModules[moduleName] = require(moduleName);
				}catch(e){
					testedModules[moduleName] = null;
				}
			}
			if(testedModules[moduleName]){
				return ifloaded(testedModules[moduleName]);
			}else{
				return ifnotloaded();
			}
		},
		getNumericLabel: function(/*Number*/ number, /*Number*/ precision, /*Object*/ kwArgs){
			var def = "";
			common.doIfLoaded("dojo/number", function(numberLib){
				def = (kwArgs.fixed ? numberLib.format(number, {places : precision < 0 ? -precision : 0}) :
					numberLib.format(number)) || "";
			}, function(){
				def = kwArgs.fixed ? number.toFixed(precision < 0 ? -precision : 0) : number.toString();
			});
			if(kwArgs.labelFunc){
				var r = kwArgs.labelFunc(def, number, precision);
				if(r){ return r; }
				// else fall through to the regular labels search
			}
			if(kwArgs.labels){
				// classic binary search
				// TODO: working only if the array is sorted per value should be better documented or sorted automatically
				var l = kwArgs.labels, lo = 0, hi = l.length;
				while(lo < hi){
					var mid = Math.floor((lo + hi) / 2), val = l[mid].value;
					if(val < number){
						lo = mid + 1;
					}else{
						hi = mid;
					}
				}
				// lets take into account FP errors
				if(lo < l.length && eq(l[lo].value, number)){
					return l[lo].text;
				}
				--lo;
				if(lo >= 0 && lo < l.length && eq(l[lo].value, number)){
					return l[lo].text;
				}
				lo += 2;
				if(lo < l.length && eq(l[lo].value, number)){
					return l[lo].text;
				}
				// otherwise we will produce a number
			}
			return def;
		}
	});
});
