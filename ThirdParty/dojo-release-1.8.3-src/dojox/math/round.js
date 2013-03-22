// AMD-ID "dojox/math/round"
define(["dojo", "dojox"], function(dojo, dojox) {

	dojo.getObject("math.round", true, dojox);
	dojo.experimental("dojox.math.round");

	dojox.math.round = function(/*Number*/value, /*Number?*/places, /*Number?*/increment){
		// summary:
		//		Similar to dojo.number.round, but compensates for binary floating point artifacts
		// description:
		//		Rounds to the nearest value with the given number of decimal places, away from zero if equal,
		//		similar to Number.toFixed().  Rounding can be done by fractional increments also.
		//		Makes minor adjustments to accommodate for precision errors due to binary floating point representation
		//		of Javascript Numbers.  See http://speleotrove.com/decimal/decifaq.html for more information.
		//		Because of this adjustment, the rounding may not be mathematically correct for full precision
		//		floating point values.  The calculations assume 14 significant figures, so the accuracy will
		//		be limited to a certain number of decimal places preserved will vary with the magnitude of
		//		the input.  This is not a substitute for decimal arithmetic.
		// value:
		//		The number to round
		// places:
		//		The number of decimal places where rounding takes place.  Defaults to 0 for whole rounding.
		//		Must be non-negative.
		// increment:
		//		Rounds next place to nearest value of increment/10.  10 by default.
		// example:
		//	|	>>> 4.8-(1.1+2.2)
		//	|	1.4999999999999996
		//	|	>>> Math.round(4.8-(1.1+2.2))
		//	|	1
		//	|	>>> dojox.math.round(4.8-(1.1+2.2))
		//	|	2
		//	|	>>> ((4.8-(1.1+2.2))/100)
		//	|	0.014999999999999996
		//	|	>>> ((4.8-(1.1+2.2))/100).toFixed(2)
		//	|	"0.01"
		//	|	>>> dojox.math.round((4.8-(1.1+2.2))/100,2)
		//	|	0.02
		//	|	>>> dojox.math.round(10.71, 0, 2.5)
		//	|	10.75
		//	|	>>> dojo.number.round(162.295, 2)
		//	|	162.29
		//	|	>>> dojox.math.round(162.295, 2)
		//	|	162.3
		var wholeFigs = Math.log(Math.abs(value))/Math.log(10);
		var factor = 10 / (increment || 10);
		var delta = Math.pow(10, -15 + wholeFigs);
		return (factor * (+value + (value > 0 ? delta : -delta))).toFixed(places) / factor; // Number
	}

	if((0.9).toFixed() == 0){
		// (isIE) toFixed() bug workaround: Rounding fails on IE when most significant digit
		// is just after the rounding place and is >=5
		var round = dojox.math.round;
		dojox.math.round = function(v, p, m){
			var d = Math.pow(10, -p || 0), a = Math.abs(v);
			if(!v || a >= d){
				d = 0;
			}else{
				a /= d;
				if(a < 0.5 || a >= 0.95){
					d = 0;
				}
			}
			return round(v, p, m) + (v > 0 ? d : -d);
		}
	}

	return dojox.math.round;
});
