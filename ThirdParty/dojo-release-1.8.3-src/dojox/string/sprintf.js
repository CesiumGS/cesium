define([
	"dojo/_base/kernel",	// dojo.getObject, dojo.mixin
	"dojo/_base/lang",	// dojo.extend
	"dojo/_base/sniff",	// dojo.isOpera
	 "./tokenize"
], function(dojo, lang, has, tokenize){
	var strLib = lang.getObject("string", true, dojox);

	strLib.sprintf = function(/*String*/ format, /*mixed...*/ filler){
		for(var args = [], i = 1; i < arguments.length; i++){
			args.push(arguments[i]);
		}
		var formatter = new strLib.sprintf.Formatter(format);
		return formatter.format.apply(formatter, args);
	};

	strLib.sprintf.Formatter = function(/*String*/ format){
		var tokens = [];
		this._mapped = false;
		this._format = format;
		this._tokens = tokenize(format, this._re, this._parseDelim, this);
	};

	lang.extend(strLib.sprintf.Formatter, {
		_re: /\%(?:\(([\w_]+)\)|([1-9]\d*)\$)?([0 +\-\#]*)(\*|\d+)?(\.)?(\*|\d+)?[hlL]?([\%scdeEfFgGiouxX])/g,
		_parseDelim: function(mapping, intmapping, flags, minWidth, period, precision, specifier){
			if(mapping){
				this._mapped = true;
			}
			return {
				mapping: mapping,
				intmapping: intmapping,
				flags: flags,
				_minWidth: minWidth, // May be dependent on parameters
				period: period,
				_precision: precision, // May be dependent on parameters
				specifier: specifier
			};
		},
		_specifiers: {
			b: {
				base: 2,
				isInt: true
			},
			o: {
				base: 8,
				isInt: true
			},
			x: {
				base: 16,
				isInt: true
			},
			X: {
				extend: ["x"],
				toUpper: true
			},
			d: {
				base: 10,
				isInt: true
			},
			i: {
				extend: ["d"]
			},
			u: {
				extend: ["d"],
				isUnsigned: true
			},
			c: {
				setArg: function(token){
					if(!isNaN(token.arg)){
						var num = parseInt(token.arg);
						if(num < 0 || num > 127){
							throw new Error("invalid character code passed to %c in sprintf");
						}
						token.arg = isNaN(num) ? "" + num : String.fromCharCode(num);
					}
				}
			},
			s: {
				setMaxWidth: function(token){
					token.maxWidth = (token.period == ".") ? token.precision : -1;
				}
			},
			e: {
				isDouble: true,
				doubleNotation: "e"
			},
			E: {
				extend: ["e"],
				toUpper: true
			},
			f: {
				isDouble: true,
				doubleNotation: "f"
			},
			F: {
				extend: ["f"]
			},
			g: {
				isDouble: true,
				doubleNotation: "g"
			},
			G: {
				extend: ["g"],
				toUpper: true
			}
		},
		format: function(/*mixed...*/ filler){
			if(this._mapped && typeof filler != "object"){
				throw new Error("format requires a mapping");
			}

			var str = "";
			var position = 0;
			for(var i = 0, token; i < this._tokens.length; i++){
				token = this._tokens[i];
				if(typeof token == "string"){
					str += token;
				}else{
					if(this._mapped){
						if(typeof filler[token.mapping] == "undefined"){
							throw new Error("missing key " + token.mapping);
						}
						token.arg = filler[token.mapping];
					}else{
						if(token.intmapping){
							var position = parseInt(token.intmapping) - 1;
						}
						if(position >= arguments.length){
							throw new Error("got " + arguments.length + " printf arguments, insufficient for '" + this._format + "'");
						}
						token.arg = arguments[position++];
					}

					if(!token.compiled){
						token.compiled = true;
						token.sign = "";
						token.zeroPad = false;
						token.rightJustify = false;
						token.alternative = false;

						var flags = {};
						for(var fi = token.flags.length; fi--;){
							var flag = token.flags.charAt(fi);
							flags[flag] = true;
							switch(flag){
								case " ":
									token.sign = " ";
									break;
								case "+":
									token.sign = "+";
									break;
								case "0":
									token.zeroPad = (flags["-"]) ? false : true;
									break;
								case "-":
									token.rightJustify = true;
									token.zeroPad = false;
									break;
								case "\#":
									token.alternative = true;
									break;
								default:
									throw Error("bad formatting flag '" + token.flags.charAt(fi) + "'");
							}
						}

						token.minWidth = (token._minWidth) ? parseInt(token._minWidth) : 0;
						token.maxWidth = -1;
						token.toUpper = false;
						token.isUnsigned = false;
						token.isInt = false;
						token.isDouble = false;
						token.precision = 1;
						if(token.period == '.'){
							if(token._precision){
								token.precision = parseInt(token._precision);
							}else{
								token.precision = 0;
							}
						}

						var mixins = this._specifiers[token.specifier];
						if(typeof mixins == "undefined"){
							throw new Error("unexpected specifier '" + token.specifier + "'");
						}
						if(mixins.extend){
							lang.mixin(mixins, this._specifiers[mixins.extend]);
							delete mixins.extend;
						}
						lang.mixin(token, mixins);
					}

					if(typeof token.setArg == "function"){
						token.setArg(token);
					}

					if(typeof token.setMaxWidth == "function"){
						token.setMaxWidth(token);
					}

					if(token._minWidth == "*"){
						if(this._mapped){
							throw new Error("* width not supported in mapped formats");
						}
						token.minWidth = parseInt(arguments[position++]);
						if(isNaN(token.minWidth)){
							throw new Error("the argument for * width at position " + position + " is not a number in " + this._format);
						}
						// negative width means rightJustify
						if (token.minWidth < 0) {
							token.rightJustify = true;
							token.minWidth = -token.minWidth;
						}
					}

					if(token._precision == "*" && token.period == "."){
						if(this._mapped){
							throw new Error("* precision not supported in mapped formats");
						}
						token.precision = parseInt(arguments[position++]);
						if(isNaN(token.precision)){
							throw Error("the argument for * precision at position " + position + " is not a number in " + this._format);
						}
						// negative precision means unspecified
						if (token.precision < 0) {
							token.precision = 1;
							token.period = '';
						}
					}

					if(token.isInt){
						// a specified precision means no zero padding
						if(token.period == '.'){
							token.zeroPad = false;
						}
						this.formatInt(token);
					}else if(token.isDouble){
						if(token.period != '.'){
							token.precision = 6;
						}
						this.formatDouble(token);
					}
					this.fitField(token);

					str += "" + token.arg;
				}
			}

			return str;
		},
		_zeros10: '0000000000',
		_spaces10: '          ',
		formatInt: function(token) {
			var i = parseInt(token.arg);
			if(!isFinite(i)){ // isNaN(f) || f == Number.POSITIVE_INFINITY || f == Number.NEGATIVE_INFINITY)
				// allow this only if arg is number
				if(typeof token.arg != "number"){
					throw new Error("format argument '" + token.arg + "' not an integer; parseInt returned " + i);
				}
				//return '' + i;
				i = 0;
			}

			// if not base 10, make negatives be positive
			// otherwise, (-10).toString(16) is '-a' instead of 'fffffff6'
			if(i < 0 && (token.isUnsigned || token.base != 10)){
				i = 0xffffffff + i + 1;
			}

			if(i < 0){
				token.arg = (- i).toString(token.base);
				this.zeroPad(token);
				token.arg = "-" + token.arg;
			}else{
				token.arg = i.toString(token.base);
				// need to make sure that argument 0 with precision==0 is formatted as ''
				if(!i && !token.precision){
					token.arg = "";
				}else{
					this.zeroPad(token);
				}
				if(token.sign){
					token.arg = token.sign + token.arg;
				}
			}
			if(token.base == 16){
				if(token.alternative){
					token.arg = '0x' + token.arg;
				}
				token.arg = token.toUpper ? token.arg.toUpperCase() : token.arg.toLowerCase();
			}
			if(token.base == 8){
				if(token.alternative && token.arg.charAt(0) != '0'){
					token.arg = '0' + token.arg;
				}
			}
		},
		formatDouble: function(token) {
			var f = parseFloat(token.arg);
			if(!isFinite(f)){ // isNaN(f) || f == Number.POSITIVE_INFINITY || f == Number.NEGATIVE_INFINITY)
				// allow this only if arg is number
				if(typeof token.arg != "number"){
					throw new Error("format argument '" + token.arg + "' not a float; parseFloat returned " + f);
				}
				// C99 says that for 'f':
				//	 infinity -> '[-]inf' or '[-]infinity' ('[-]INF' or '[-]INFINITY' for 'F')
				//	 NaN -> a string  starting with 'nan' ('NAN' for 'F')
				// this is not commonly implemented though.
				//return '' + f;
				f = 0;
			}

			switch(token.doubleNotation) {
				case 'e': {
					token.arg = f.toExponential(token.precision);
					break;
				}
				case 'f': {
					token.arg = f.toFixed(token.precision);
					break;
				}
				case 'g': {
					// C says use 'e' notation if exponent is < -4 or is >= prec
					// ECMAScript for toPrecision says use exponential notation if exponent is >= prec,
					// though step 17 of toPrecision indicates a test for < -6 to force exponential.
					if(Math.abs(f) < 0.0001){
						//print("forcing exponential notation for f=" + f);
						token.arg = f.toExponential(token.precision > 0 ? token.precision - 1 : token.precision);
					}else{
						token.arg = f.toPrecision(token.precision);
					}

					// In C, unlike 'f', 'gG' removes trailing 0s from fractional part, unless alternative format flag ("#").
					// But ECMAScript formats toPrecision as 0.00100000. So remove trailing 0s.
					if(!token.alternative){
						//print("replacing trailing 0 in '" + s + "'");
						token.arg = token.arg.replace(/(\..*[^0])0*/, "$1");
						// if fractional part is entirely 0, remove it and decimal point
						token.arg = token.arg.replace(/\.0*e/, 'e').replace(/\.0$/,'');
					}
					break;
				}
				default: throw new Error("unexpected double notation '" + token.doubleNotation + "'");
			}

			// C says that exponent must have at least two digits.
			// But ECMAScript does not; toExponential results in things like "1.000000e-8" and "1.000000e+8".
			// Note that s.replace(/e([\+\-])(\d)/, "e$10$2") won't work because of the "$10" instead of "$1".
			// And replace(re, func) isn't supported on IE50 or Safari1.
			token.arg = token.arg.replace(/e\+(\d)$/, "e+0$1").replace(/e\-(\d)$/, "e-0$1");

			// Ensure a '0' before the period.
			// Opera implements (0.001).toString() as '0.001', but (0.001).toFixed(1) is '.001'
			if(has("opera")){
				token.arg = token.arg.replace(/^\./, '0.');
			}

			// if alt, ensure a decimal point
			if(token.alternative){
				token.arg = token.arg.replace(/^(\d+)$/,"$1.");
				token.arg = token.arg.replace(/^(\d+)e/,"$1.e");
			}

			if(f >= 0 && token.sign){
				token.arg = token.sign + token.arg;
			}

			token.arg = token.toUpper ? token.arg.toUpperCase() : token.arg.toLowerCase();
		},
		zeroPad: function(token, /*Int*/ length) {
			length = (arguments.length == 2) ? length : token.precision;
			if(typeof token.arg != "string"){
				token.arg = "" + token.arg;
			}

			var tenless = length - 10;
			while(token.arg.length < tenless){
				token.arg = (token.rightJustify) ? token.arg + this._zeros10 : this._zeros10 + token.arg;
			}
			var pad = length - token.arg.length;
			token.arg = (token.rightJustify) ? token.arg + this._zeros10.substring(0, pad) : this._zeros10.substring(0, pad) + token.arg;
		},
		fitField: function(token) {
			if(token.maxWidth >= 0 && token.arg.length > token.maxWidth){
				return token.arg.substring(0, token.maxWidth);
			}
			if(token.zeroPad){
				this.zeroPad(token, token.minWidth);
				return;
			}
			this.spacePad(token);
		},
		spacePad: function(token, /*Int*/ length) {
			length = (arguments.length == 2) ? length : token.minWidth;
			if(typeof token.arg != 'string'){
				token.arg = '' + token.arg;
			}

			var tenless = length - 10;
			while(token.arg.length < tenless){
				token.arg = (token.rightJustify) ? token.arg + this._spaces10 : this._spaces10 + token.arg;
			}
			var pad = length - token.arg.length;
			token.arg = (token.rightJustify) ? token.arg + this._spaces10.substring(0, pad) : this._spaces10.substring(0, pad) + token.arg;
		}
	});
	return strLib.sprintf;
});
