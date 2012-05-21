define(["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array", "dojo/date", "dojo/i18n", "dojo/regexp", "dojo/string", "./Date", "dojo/i18n!dojo/cldr/nls/islamic"],
	function(dojo, dlang, darray, dd, i18n, regexp, string, islamicDate){

	dojo.getObject("date.islamic.locale", true, dojox);
	dojo.experimental("dojox.date.islamic.locale");

	dojo.requireLocalization("dojo.cldr", "islamic");

	// Format a pattern without literals
	function formatPattern(dateObject, bundle, locale, fullYear,  pattern){

		return pattern.replace(/([a-z])\1*/ig, function(match){
			var s, pad;
			var c = match.charAt(0);
			var l = match.length;
			var widthList = ["abbr", "wide", "narrow"];
			
			switch(c){
				case 'G':
					s = bundle["eraAbbr"][0];
					break;
				case 'y':
					s = String(dateObject.getFullYear());
					break;
				case 'M':
					var m = dateObject.getMonth();
					if(l<3){
						s = m+1; pad = true;
					}else{
						var propM = ["months", "format", widthList[l-3]].join("-");
						s = bundle[propM][m];
					}
					break;
				case 'd':
					s = dateObject.getDate(true); pad = true;
					break;
				case 'E':
					var d = dateObject.getDay();
					if(l<3){
						s = d+1; pad = true;
					}else{
						var propD = ["days", "format", widthList[l-3]].join("-");
						s = bundle[propD][d];
					}
					break;
				case 'a':
					var timePeriod = (dateObject.getHours() < 12) ? 'am' : 'pm';
					s = bundle['dayPeriods-format-wide-' + timePeriod];
					break;
				case 'h':
				case 'H':
				case 'K':
				case 'k':
					var h = dateObject.getHours();
					switch (c){
						case 'h': // 1-12
							s = (h % 12) || 12;
							break;
						case 'H': // 0-23
							s = h;
							break;
						case 'K': // 0-11
							s = (h % 12);
							break;
						case 'k': // 1-24
							s = h || 24;
							break;
					}
					pad = true;
					break;
				case 'm':
					s = dateObject.getMinutes(); pad = true;
					break;
				case 's':
					s = dateObject.getSeconds(); pad = true;
					break;
				case 'S':
					s = Math.round(dateObject.getMilliseconds() * Math.pow(10, l-3)); pad = true;
					break;
				case 'z':
					// We only have one timezone to offer; the one from the browser
					s = dd.getTimezoneName(dateObject.toGregorian());
					if(s){ break; }
					l = 4;
					// fallthrough... use GMT if tz not available
				case 'Z':
					var offset = dateObject.toGregorian().getTimezoneOffset();
					var tz = [
						(offset <= 0 ? "+" : "-"),
						string.pad(Math.floor(Math.abs(offset) / 60), 2),
						string.pad(Math.abs(offset) % 60, 2)
					];
					if(l == 4){
						tz.splice(0, 0, "GMT");
						tz.splice(3, 0, ":");
					}
					s = tz.join("");
					break;
				default:
					throw new Error("dojox.date.islamic.locale.formatPattern: invalid pattern char: "+pattern);
			}
			if(pad){ s = string.pad(s, l); }
			return s;
		});
	}
	
	// based on and similar to dojo.date.locale.format
	dojox.date.islamic.locale.format = function(/*islamic.Date*/dateObject, /*Object?*/options){
		// summary:
		//		Format a Date object as a String, using  settings.
		options = options || {};

		var locale = i18n.normalizeLocale(options.locale);
		var formatLength = options.formatLength || 'short';
		var bundle = dojox.date.islamic.locale._getIslamicBundle(locale);
		var str = [];

		var sauce = dojo.hitch(this, formatPattern, dateObject, bundle, locale, options.fullYear);
		if(options.selector == "year"){
			var year = dateObject.getFullYear();
			return year;
		}
		if(options.selector != "time"){
			var datePattern = options.datePattern || bundle["dateFormat-"+formatLength];
			if(datePattern){str.push(_processPattern(datePattern, sauce));}
		}
		if(options.selector != "date"){
			var timePattern = options.timePattern || bundle["timeFormat-"+formatLength];
			if(timePattern){str.push(_processPattern(timePattern, sauce));}
		}
		var result = str.join(" "); //TODO: use locale-specific pattern to assemble date + time

		return result; // String
	};

	dojox.date.islamic.locale.regexp = function(/*object?*/options){
		//	based on and similar to dojo.date.locale.regexp
		// summary:
		//		Builds the regular needed to parse a islamic.Date
		return dojox.date.islamic.locale._parseInfo(options).regexp; // String
	};

	dojox.date.islamic.locale._parseInfo = function(/*oblect?*/options){
	/* based on and similar to dojo.date.locale._parseInfo */

		options = options || {};
		var locale = i18n.normalizeLocale(options.locale);
		var bundle = dojox.date.islamic.locale._getIslamicBundle(locale);
		var formatLength = options.formatLength || 'short';
		var datePattern = options.datePattern || bundle["dateFormat-" + formatLength];
		var timePattern = options.timePattern || bundle["timeFormat-" + formatLength];

		var pattern;
		if(options.selector == 'date'){
			pattern = datePattern;
		}else if(options.selector == 'time'){
			pattern = timePattern;
		}else{
			pattern = (typeof (timePattern) == "undefined") ? datePattern : datePattern + ' ' + timePattern;
		}

		var tokens = [];
	
		var re = _processPattern(pattern, dojo.hitch(this, _buildDateTimeRE, tokens, bundle, options));
		return {regexp: re, tokens: tokens, bundle: bundle};
	};

	dojox.date.islamic.locale.parse = function(/*String*/value, /*Object?*/options){
		// based on and similar to dojo.date.locale.parse
		// summary: This function parse string date value according to options
	
		value =  value.replace(/[\u200E\u200F\u202A\u202E]/g, ""); //remove bidi non-printing chars

		if(!options){ options={}; }
		var info = dojox.date.islamic.locale._parseInfo(options);

		var tokens = info.tokens, bundle = info.bundle;
		var regexp = info.regexp.replace(/[\u200E\u200F\u202A\u202E]/g, ""); //remove bidi non-printing chars from the pattern
		var re = new RegExp("^" + regexp + "$");

		var match = re.exec(value);

		var locale = i18n.normalizeLocale(options.locale);

		if(!match){
			console.debug("dojox.date.islamic.locale.parse: value  "+value+" doesn't match pattern   " + re);
			return null;
		} // null
	
		var date, date1;
	
		var result = [1389,0,1,0,0,0,0];  //FIXME: islamic date for [1970,0,1,0,0,0,0] used in gregorian locale
		var amPm = "";
		var mLength = 0;
		var widthList = ["abbr", "wide", "narrow"];
		var valid = dojo.every(match, function(v, i){
			if(!i){return true;}
			var token=tokens[i-1];
			var l=token.length;
			switch(token.charAt(0)){
				case 'y':
					result[0] = Number(v);
					break;
				case 'M':
					if(l>2){
						var months = bundle['months-format-' + widthList[l-3]].concat();
						if(!options.strict){
							//Tolerate abbreviating period in month part
							//Case-insensitive comparison
							v = v.replace(".","").toLowerCase();
							months = dojo.map(months, function(s){ return s ? s.replace(".","").toLowerCase() : s; } );
						}
						v = dojo.indexOf(months, v);
						if(v == -1){
							return false;
						}
						mLength = l;
					}else{
						v--;
					}
					result[1] = Number(v);
					break;
				case 'D':
					result[1] = 0;
					// fallthrough...
				case 'd':
						result[2] =  Number(v);
					break;
				case 'a': //am/pm
					var am = options.am || bundle['dayPeriods-format-wide-am'],
						pm = options.pm || bundle['dayPeriods-format-wide-pm'];
					if(!options.strict){
						var period = /\./g;
						v = v.replace(period,'').toLowerCase();
						am = am.replace(period,'').toLowerCase();
						pm = pm.replace(period,'').toLowerCase();
					}
					if(options.strict && v != am && v != pm){
						return false;
					}

					// we might not have seen the hours field yet, so store the state and apply hour change later
					amPm = (v == pm) ? 'p' : (v == am) ? 'a' : '';
					break;
				case 'K': //hour (1-24)
					if(v == 24){ v = 0; }
					// fallthrough...
				case 'h': //hour (1-12)
				case 'H': //hour (0-23)
				case 'k': //hour (0-11)
					//in the 12-hour case, adjusting for am/pm requires the 'a' part
					//which could come before or after the hour, so we will adjust later
					result[3] = Number(v);
					break;
				case 'm': //minutes
					result[4] = Number(v);
					break;
				case 's': //seconds
					result[5] = Number(v);
					break;
				case 'S': //milliseconds
					result[6] = Number(v);
			}
			return true;
		});

		var hours = +result[3];
		if(amPm === 'p' && hours < 12){
			result[3] = hours + 12; //e.g., 3pm -> 15
		}else if(amPm === 'a' && hours == 12){
			result[3] = 0; //12am -> 0
		}
		var dateObject = new islamicDate(result[0], result[1], result[2], result[3], result[4], result[5], result[6]);
		return dateObject;
	};

	function _processPattern(pattern, applyPattern, applyLiteral, applyAll){
		//summary: Process a pattern with literals in it

		// Break up on single quotes, treat every other one as a literal, except '' which becomes '
		var identity = function(x){return x;};
		applyPattern = applyPattern || identity;
		applyLiteral = applyLiteral || identity;
		applyAll = applyAll || identity;

		//split on single quotes (which escape literals in date format strings)
		//but preserve escaped single quotes (e.g., o''clock)
		var chunks = pattern.match(/(''|[^'])+/g);
		var literal = pattern.charAt(0) == "'";

		dojo.forEach(chunks, function(chunk, i){
			if(!chunk){
				chunks[i]='';
			}else{
				chunks[i]=(literal ? applyLiteral : applyPattern)(chunk);
				literal = !literal;
			}
		});
		return applyAll(chunks.join(''));
	}

	function _buildDateTimeRE  (tokens, bundle, options, pattern){
			// based on and similar to dojo.date.locale._buildDateTimeRE
			//
	
		pattern = regexp.escapeString(pattern);
		var locale = i18n.normalizeLocale(options.locale);
	
		return pattern.replace(/([a-z])\1*/ig, function(match){

				// Build a simple regexp.  Avoid captures, which would ruin the tokens list
				var s;
				var c = match.charAt(0);
				var l = match.length;
				var p2 = '', p3 = '';
				if(options.strict){
					if(l > 1){ p2 = '0' + '{'+(l-1)+'}'; }
					if(l > 2){ p3 = '0' + '{'+(l-2)+'}'; }
				}else{
					p2 = '0?'; p3 = '0{0,2}';
				}
				switch(c){
					case 'y':
						s = '\\d+';
						break;
					case 'M':
						s = (l>2) ?  '\\S+ ?\\S+' : p2+'[1-9]|1[0-2]';
						break;
					case 'd':
						s = '[12]\\d|'+p2+'[1-9]|3[01]';
						break;
					case 'E':
						s = '\\S+';
						break;
					case 'h': //hour (1-12)
						s = p2+'[1-9]|1[0-2]';
						break;
					case 'k': //hour (0-11)
						s = p2+'\\d|1[01]';
						break;
					case 'H': //hour (0-23)
						s = p2+'\\d|1\\d|2[0-3]';
						break;
					case 'K': //hour (1-24)
						s = p2+'[1-9]|1\\d|2[0-4]';
						break;
					case 'm':
					case 's':
						s = p2+'\\d|[0-5]\\d';
						break;
					case 'S':
						s = '\\d{'+l+'}';
						break;
					case 'a':
						var am = options.am || bundle['dayPeriods-format-wide-am'],
							pm = options.pm || bundle['dayPeriods-format-wide-pm'];
						if(options.strict){
							s = am + '|' + pm;
						}else{
							s = am + '|' + pm;
							if(am != am.toLowerCase()){ s += '|' + am.toLowerCase(); }
							if(pm != pm.toLowerCase()){ s += '|' + pm.toLowerCase(); }
						}
						break;
					default:
						s = ".*";
				}
				if(tokens){ tokens.push(match); }
				return "(" + s + ")"; // add capture
			}).replace(/[\xa0 ]/g, "[\\s\\xa0]"); // normalize whitespace.  Need explicit handling of \xa0 for IE. */
	}

	var _customFormats = [];
	dojox.date.islamic.locale.addCustomFormats = function(/*String*/packageName, /*String*/bundleName){
		// summary:
		//		Add a reference to a bundle containing localized custom formats to be
		//		used by date/time formatting and parsing routines.
		_customFormats.push({pkg:packageName,name:bundleName});
	};

	dojox.date.islamic.locale._getIslamicBundle = function(/*String*/locale){
		var islamic = {};
		dojo.forEach(_customFormats, function(desc){
			var bundle = i18n.getLocalization(desc.pkg, desc.name, locale);
			islamic = dojo.mixin(islamic, bundle);
		}, this);
		return islamic; /*Object*/
	};

	dojox.date.islamic.locale.addCustomFormats("dojo.cldr","islamic");

	dojox.date.islamic.locale.getNames = function(/*String*/item, /*String*/type, /*String?*/context, /*String?*/locale, /*islamic Date Object?*/date){
		// summary:
		//		Used to get localized strings from dojo.cldr for day or month names.
		var label;
		var lookup = dojox.date.islamic.locale._getIslamicBundle(locale);
		var props = [item, context, type];
		if(context == 'standAlone'){
			var key = props.join('-');
			label = lookup[key];
			// Fall back to 'format' flavor of name
			if(label[0] == 1){ label = undefined; } // kludge, in the absence of real aliasing support in dojo.cldr
		}
		props[1] = 'format';
	
		// return by copy so changes won't be made accidentally to the in-memory model
		return (label || lookup[props.join('-')]).concat(); /*Array*/
	};


	dojox.date.islamic.locale.weekDays = dojox.date.islamic.locale.getNames('days', 'wide', 'format');

	dojox.date.islamic.locale.months = dojox.date.islamic.locale.getNames('months', 'wide', 'format');

	return dojox.date.islamic.locale;
});