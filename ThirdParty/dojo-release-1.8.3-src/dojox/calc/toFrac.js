define([
	"dojo/_base/lang",
	"dojox/calc/_Executor"
], function(lang, calc) {

	var multiples;

	function _fracHashInit(){
		var sqrts = [
			5,6,7,10,11,13,14,15,17,19,21,22,23,26,29,
			30,31,33,34,35,37,38,39,41,42,43,46,47,51,53,55,57,58,59,
			61,62,65,66,67,69,70,71,73,74,77,78,79,82,83,85,86,87,89,91,93,94,95,97
		];
		multiples = { "1":1, "\u221A(2)":Math.sqrt(2), "\u221A(3)":Math.sqrt(3), "pi":Math.PI };
		// populate the rest of the multiples array
		for(var i in sqrts){
			var n = sqrts[i];
			multiples["\u221A("+n+")"] = Math.sqrt(n);
		}
		multiples["\u221A(pi)"] = Math.sqrt(Math.PI);
	}

	function _fracLookup(number){
		function findSimpleFraction(fraction){
			var denom1Low = Math.floor(1 / fraction);
			// fraction <= 1/denom1Low 
			var quotient = calc.approx(1 / denom1Low);
			if(quotient == fraction){ return { n:1, d:denom1Low }; }
			var denom1High = denom1Low + 1;
			// 1/denom1High <= fraction < 1/denom1Low 
			quotient = calc.approx(1 / denom1High);
			if(quotient == fraction){ return { n:1, d:denom1High }; }
			if(denom1Low >= 50){ return null; } // only 1's in the numerator beyond this point
			// 1/denom1High < fraction < 1/denom1Low 
			var denom2 = denom1Low + denom1High;
			quotient = calc.approx(2 / denom2);
			// 1/denom1High < 2/(denom1Low+denom1High) < 1/denom1Low 
			if(quotient == fraction){ return { n:2, d:denom2 }; }
			if(denom1Low >= 34){ return null; } // only 1's and 2's in the numerator beyond this point
			var less2 = fraction < quotient;
			// if less2
			//	1/denom1High < fraction < 2/(denom1Low+denom1High)
			// else
			//	2/(denom1Low+denom1High) < fraction < 1/denom1Low
			var denom4 = denom2 * 2 + (less2 ? 1 : -1);
			quotient = calc.approx(4 / denom4);
			// 1/denom1High < 4/(2*denom1Low+2*denom1High+1) < 2/(denom1Low+denom1High) < 4/(2*denom1Low+2*denom1High-1) < 1/denom1Low 
			if(quotient == fraction){ return { n:4, d:denom4 }; }
			var less4 = fraction < quotient;
			// we've already checked for 1, 2 and 4, but now see if we need to check for 3 in the numerator
			if((less2 && !less4) || (!less2 && less4)){
				var denom3 = (denom2 + denom4) >> 1;
				quotient = calc.approx(3 / denom3);
				// 1/denom1High < 4/(2*denom1Low+2*denom1High+1) < 3/((3*denom1Low+3*denom1High+1)/2) < 2/(denom1Low+denom1High) < 3/((3*denom1Low+3*denom1High-1)/2) < 4/(2*denom1Low+2*denom1High-1) < 1/denom1Low 
				if(quotient == fraction){ return { n:3, d:denom3 }; }
			}
			if(denom1Low >= 20){ return null; } // only 1's, 2's, 3's, and 4's in the numerator beyond this point
			// if less2
			// 	if less4
			//		1/denom1High < fraction < 4/(2*denom1Low+2*denom1High+1)
			//	else
			//		4/(2*denom1Low+2*denom1High+1) < fraction < 2/(denom1Low+denom1High)
			// else
			// 	if less4
			//		2/(denom1Low+denom1High) < fraction < 4/(2*denom1Low+2*denom1High-1)
			//	else
			//		4/(2*denom1Low+2*denom1High-1) < fraction < 1/denom1Low
			var smallestDenom = denom2 + denom1Low * 2;
			var largestDenom = smallestDenom + 2;
			for(var numerator = 5; smallestDenom <= 100; numerator++){ // start with 5 in the numerator
				smallestDenom += denom1Low;
				largestDenom += denom1High;
				var startDenom = less2 ? ((largestDenom + smallestDenom + 1) >> 1) : smallestDenom;
				var stopDenom = less2 ? largestDenom : ((largestDenom + smallestDenom - 1) >> 1);
				startDenom = less4 ? ((startDenom + stopDenom) >> 1) : startDenom;
				stopDenom = less4 ? stopDenom : ((startDenom + stopDenom) >> 1);
				for(var thisDenom = startDenom; thisDenom <= stopDenom; thisDenom++){
					if(numerator & 1 == 0 && thisDenom & 1 == 0){ continue; } // skip where n and d are both even
					quotient = calc.approx(numerator / thisDenom);
					if(quotient == fraction){ return { n:numerator, d:thisDenom }; }
					if(quotient < fraction){ break; } // stop since the values will just get smaller
				}
			}
			return null;
		}
		number = Math.abs(number);
		for(var mt in multiples){
			var multiple = multiples[mt];
			var simpleFraction = number / multiple;
			var wholeNumber = Math.floor(simpleFraction);
			simpleFraction = calc.approx(simpleFraction - wholeNumber);
			if(simpleFraction == 0){
				return { mt:mt, m:multiple, n:wholeNumber, d:1 };
			}else{
				var a = findSimpleFraction(simpleFraction);
				if(!a){ continue; }
				return { mt:mt, m:multiple, n:(wholeNumber * a.d + a.n), d:a.d };
			}
		}
		return null;
	}

	// make the hash
	_fracHashInit();

	// add toFrac to the calculator
	return lang.mixin(calc, {
		toFrac: function(number){// get a string fraction for a decimal with a set range of numbers, based on the hash
			var f = _fracLookup(number);
			return f ? ((number < 0 ? '-' : '') + (f.m == 1 ? '' : (f.n == 1 ? '' : (f.n + '*'))) + (f.m == 1 ? f.n : f.mt) + ((f.d == 1 ? '' : '/' + f.d))) : number;
			//return f ? ((number < 0 ? '-' : '') + (f.m == 1 ? '' : (f.n == 1 ? '' : (f.n + '*'))) + (f.m == 1 ? f.n : f.mt) + '/' + f.d) : number;
		},
		pow: function(base, exponent){// pow benefits from toFrac because it can overcome many of the limitations set before the standard Math.pow
			// summary:
			//		Computes base ^ exponent

			//	Wrapper to Math.pow(base, exponent) to handle (-27) ^ (1/3)
			function isInt(n){
				return Math.floor(n) == n;
			}

			if(base>0||isInt(exponent)){
				return Math.pow(base, exponent);
			}else{
				var f = _fracLookup(exponent);
				if(base >= 0){
					return (f && f.m == 1)
						? Math.pow(Math.pow(base, 1 / f.d), exponent < 0 ? -f.n : f.n) // 32 ^ (2/5) is much more accurate if done as (32 ^ (1/5)) ^ 2
						: Math.pow(base, exponent);
				}else{	// e.g. (1/3) root of -27 = -3, 1 / exponent must be an odd integer for a negative base
					return (f && f.d & 1) ? Math.pow(Math.pow(-Math.pow(-base, 1 / f.d), exponent < 0 ? -f.n : f.n), f.m) : NaN;
				}
			}
		}
	});
/*
	function reduceError(number){
		var f = _fracLookup(number);
		if(!f){ f = _fracLookup(number); }
		return f ? ((number < 0 ? -1 : 1) * f.n * f.m / f.d) : number;
	}
*/
});
