define(["../..", "dojo/_base/lang", "dojo/_base/array", "dojo/date", "dojo/i18n", "dojo/regexp", "dojo/string", "./Date", "./numerals", "dojo/i18n!dojo/cldr/nls/hebrew"],
	function(dojox, lang, arr, dd, i18n, regexp, string, HDate, numerals){

	var hlocale = lang.getObject("date.hebrew.locale", true, dojox);

	//Load the bundles containing localization information for
	// names and formats
	i18n.getLocalization("dojo.cldr", "hebrew");

	// Format a pattern without literals
	function formatPattern(dateObject, bundle, locale, fullYear,  pattern){

		return pattern.replace(/([a-z])\1*/ig, function(match){
			var s, pad;
			var c = match.charAt(0);
			var l = match.length;
			var widthList = ["abbr", "wide", "narrow"];
			
			switch(c){
				case 'y':
					if(locale.match(/^he(?:-.+)?$/)){
						s = numerals.getYearHebrewLetters(dateObject.getFullYear());
					}else{
						s = String(dateObject.getFullYear());
					}
					break;
				case 'M':
					var m = dateObject.getMonth();
					if(l<3){
						if(!dateObject.isLeapYear(dateObject.getFullYear()) && m>5){m--;}
						if(locale.match(/^he(?:-.+)?$/)){
							s = numerals.getMonthHebrewLetters(m);
						}else{
							s = m+1; pad = true;
						}
					}else{
						var monthNames = hlocale.getNames('months',widthList[l-3], 'format', locale, dateObject);
						s = monthNames[m];
					}
					break;
				case 'd':
					if(locale.match(/^he(?:-.+)?$/)){
						s =  dateObject.getDateLocalized(locale);
					}else{
						s = dateObject.getDate(); pad = true;
					}
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
					// strange choices in the date format make it impossible to write this succinctly
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
					s = "";
					break;
				default:
					throw new Error("dojox.date.hebrew.locale.formatPattern: invalid pattern char: "+pattern);
			}
			if(pad){ s = string.pad(s, l); }
			return s;
		});
	}
	
	hlocale.format = function(/*dojox/date/hebrewDate*/dateObject, /*object?*/options){
		// summary:
		//		Format a Date object as a String, using  settings.
		// description:
		//		Create a string from a hebrew.Date object using a known pattern.
		//		By default, this method formats both date and time from dateObject.
		//		Default formatting lengths is 'short'
		// dateObject:
		//		the date and/or time to be formatted.  If a time only is formatted,
		//		the values in the year, month, and day fields are irrelevant.  The
		//		opposite is true when formatting only dates.

		// based on and similar to dojo.date.locale.format

		options = options || {};

		var locale = i18n.normalizeLocale(options.locale);
		var formatLength = options.formatLength || 'short';
		var bundle = hlocale._getHebrewBundle(locale);
		var str = [];

		var sauce = lang.hitch(this, formatPattern, dateObject, bundle, locale, options.fullYear);
		if(options.selector == "year"){
			var year = dateObject.getFullYear();
			return locale.match(/^he(?:-.+)?$/) ?
				numerals.getYearHebrewLetters(year) : year;
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

	hlocale.regexp = function(/*object?*/options){
		// summary:
		//		Builds the regular needed to parse a hebrew.Date

		//	based on and similar to dojo.date.locale.regexp

		return hlocale._parseInfo(options).regexp; // String
	};

	hlocale._parseInfo = function(/*oblect?*/options){
	/* based on and similar to dojo.date.locale._parseInfo */

		options = options || {};
		var locale = i18n.normalizeLocale(options.locale);
		var bundle = hlocale._getHebrewBundle(locale);

		var formatLength = options.formatLength || 'short';
		var datePattern = options.datePattern || bundle["dateFormat-" + formatLength];
		var timePattern = options.timePattern || bundle["timeFormat-" + formatLength];

		var pattern;
		if(options.selector == 'date'){
			pattern = datePattern;
		}else if(options.selector == 'time'){
			pattern = timePattern;
		}else{
			pattern = (timePattern === undefined) ? datePattern : datePattern + ' ' + timePattern; //hebrew resource file does not contain time patterns - a bug?
		}

		var tokens = [];
	
		var re = _processPattern(pattern, lang.hitch(this, _buildDateTimeRE, tokens, bundle, options));
		return {regexp: re, tokens: tokens, bundle: bundle};
	};

	hlocale.parse = function(/*String*/value, /*Object?*/options){
		// summary:
		//		This function parse string date value according to options
		// example:
		//	|	var dateHebrew = dojox.date.hebrew.locale.parse('11/10/5740', {datePattern:'dd/MM/yy', selector:'date'});
		//	|	in Hebrew locale string for parsing contains Hebrew Numerals
		//	|
		//	|	  options = {datePattern:'dd MMMM yy', selector:'date'};
		//	|
		//	|	   y - year
		//	|	   M, MM  - short month
		//	|	  MMM, MMMM - long month
		//	|	  d - date
		//	|	  a - am, pm
		//	|	   E, EE, EEE, EEEE  - week day
		//	|
		//	|	    h, H, k, K, m, s, S,  -  time format

		// based on and similar to dojo.date.locale.parse

		value =  value.replace(/[\u200E\u200F\u202A-\u202E]/g, ""); //remove special chars

		if(!options){options={};}
		var info = hlocale._parseInfo(options);
	
		var tokens = info.tokens, bundle = info.bundle;
		var re = new RegExp("^" + info.regexp + "$");
	
		var match = re.exec(value);

		var locale = i18n.normalizeLocale(options.locale);

		if(!match){ return null; } // null
	
		var date, date1;
	
		//var result = [1970,0,1,0,0,0,0]; //
		var result = [5730,3,23,0,0,0,0];  // hebrew date for [1970,0,1,0,0,0,0] used in gregorian locale
		var amPm = "";
		var mLength = 0;
		var widthList = ["abbr", "wide", "narrow"];
		var valid = arr.every(match, function(v, i){
			if(!i){return true;}
			var token=tokens[i-1];
			var l=token.length;
			switch(token.charAt(0)){
				case 'y':
					if(locale.match(/^he(?:-.+)?$/)){
						result[0] = numerals.parseYearHebrewLetters(v);
					}else{
						result[0] = Number(v);
					}
					break;
				case 'M':
					//if  it is short format, month is one letter or two letter with "geresh"
					if(l>2){
						//we do not know here if the year is leap or not
						var months = hlocale.getNames('months', widthList[l-3], 'format', locale, new HDate(5769, 1, 1)),
							leapmonths = hlocale.getNames('months', widthList[l-3], 'format', locale, new HDate(5768, 1, 1));
						if(!options.strict){
							//Tolerate abbreviating period in month part
							//Case-insensitive comparison
							v = v.replace(".","").toLowerCase();
							months = arr.map(months, function(s){ return s ? s.replace(".","").toLowerCase() : s; } );
							leapmonths = arr.map(leapmonths, function(s){ return s ? s.replace(".","").toLowerCase() : s; } );
						}
						var monthName = v;
						v = arr.indexOf(months, monthName);
						if(v == -1){
							v = arr.indexOf(leapmonths, monthName);
							if(v == -1){
								//console.debug("dojox.date.hebrew.locale.parse: Could not parse month name:  second   " + v +"'.");
								return false;
							}
						}
						mLength = l;
					}else{
						if(locale.match(/^he(?:-.+)?$/)){
							v = numerals.parseMonthHebrewLetters(v);
						}else{
							v--;
						}
					}
					result[1] = Number(v);
					break;
				case 'D':
					result[1] = 0;
					// fallthrough...
				case 'd':
					if(locale.match(/^he(?:-.+)?$/)){
						result[2] = numerals.parseDayHebrewLetters(v);
					}else{
						result[2] = Number(v);
					}
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
		var dateObject = new HDate(result[0], result[1], result[2], result[3], result[4], result[5], result[6]); // hebrew.Date
		//for non leap year, the index of the short month start from adar should be increased by 1
		if(mLength < 3 && result[1] >= 5 && !dateObject.isLeapYear(dateObject.getFullYear())){
			dateObject.setMonth(result[1]+1);
		}
		return dateObject; // hebrew.Date
	};


	function _processPattern(pattern, applyPattern, applyLiteral, applyAll){
		// summary:
		//		Process a pattern with literals in it

		// Break up on single quotes, treat every other one as a literal, except '' which becomes '
		var identity = function(x){return x;};
		applyPattern = applyPattern || identity;
		applyLiteral = applyLiteral || identity;
		applyAll = applyAll || identity;

		//split on single quotes (which escape literals in date format strings)
		//but preserve escaped single quotes (e.g., o''clock)
		var chunks = pattern.match(/(''|[^'])+/g);
		var literal = pattern.charAt(0) == "'";

		arr.forEach(chunks, function(chunk, i){
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
						s = '\\S+';
						break;
					case 'M':
						if(locale.match('^he(?:-.+)?$')){
							s = (l>2) ? '\\S+ ?\\S+' : '\\S{1,4}';
						}else{
							s = (l>2) ?  '\\S+ ?\\S+' : p2+'[1-9]|1[0-2]';
						}
						break;
					case 'd':
						if(locale.match('^he(?:-.+)?$')){
							s = '\\S[\'\"\'\u05F3]{1,2}\\S?';
						}else{
							s = '[12]\\d|'+p2+'[1-9]|30';
						}
						break;
					case 'E':
						if(locale.match('^he(?:-.+)?$')){
							s = (l>3) ? '\\S+ ?\\S+' : '\\S';
						}else{
							s = '\\S+';
						}
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
	hlocale.addCustomFormats = function(/*String*/packageName, /*String*/bundleName){
		// summary:
		//		Add a reference to a bundle containing localized custom formats to be
		//		used by date/time formatting and parsing routines.
		// description:
		//		The user may add custom localized formats where the bundle has properties following the
		//		same naming convention used by dojo.cldr: `dateFormat-xxxx` / `timeFormat-xxxx`
		//		The pattern string should match the format used by the CLDR.
		//		See dojo.date.locale.format() for details.
		//		The resources must be loaded by dojo.requireLocalization() prior to use

		_customFormats.push({pkg:packageName,name:bundleName});
	};

	hlocale._getHebrewBundle = function(/*String*/locale){
		var hebrew = {};
		arr.forEach(_customFormats, function(desc){
			var bundle = i18n.getLocalization(desc.pkg, desc.name, locale);
			hebrew = lang.mixin(hebrew, bundle);
		}, this);
		return hebrew; /*Object*/
	};

	hlocale.addCustomFormats("dojo.cldr","hebrew");

	hlocale.getNames = function(/*String*/item, /*String*/type, /*String?*/context, /*String?*/locale, /*dojox/date/hebrew/Date?*/date){
		// summary:
		//		Used to get localized strings from dojo.cldr for day or month names.
		// item:
		//		'months' || 'days'
		// type:
		//		'wide' || 'narrow' || 'abbr' (e.g. "Monday", "Mon", or "M" respectively, in English)
		// use:
		//		'standAlone' || 'format' (default)
		// locale:
		//		override locale used to find the names
		// date:
		//		required for item=months to determine leap month name

		// using  var monthNames = dojox.date.hebrew.locale.getNames('months', 'wide', 'format', 'he', new hebrewDate(5768, 2, 12));

		var label,
			lookup = hlocale._getHebrewBundle(locale),
			props = [item, context, type];
		if(context == 'standAlone'){
			var key = props.join('-');
			label = lookup[key];
			// Fall back to 'format' flavor of name
			if(label[0] == 1){ label = undefined; } // kludge, in the absence of real aliasing support in dojo.cldr
		}
		props[1] = 'format';
	
		// return by copy so changes won't be made accidentally to the in-memory model
		var result = (label || lookup[props.join('-')]).concat();

		if(item == "months"){
			if(date.isLeapYear(date.getFullYear())){
				// Adar I (6th position in the array) will be used.
				// Substitute the leap month Adar II for the regular Adar (7th position)
				props.push("leap");
				result[6] = lookup[props.join('-')];
			}else{
				// Remove Adar I but leave an empty position in the array
				delete result[5];
			}
		}

		return result; /*Array*/
	};

	return hlocale;
});
