/******************************************************************************
 * Dojo port of fleegix date plugin from
 *
 *   http://js.fleegix.org/plugins/date/date
 *
 * contributed to Dojo under CLA, with thanks to Matthew Eernisse (mde@fleegix.org)
 * and Open Source Applications Foundation
 *
 * Credits: Ideas included from incomplete JS implementation of Olson
 * parser, "XMLDate" by Philippe Goetz (philippe.goetz@wanadoo.fr)
 *****************************************************************************/

define(["dojo", "dojo/date", "dojo/date/locale", "dojo/_base/array", "dojo/_base/xhr"],
	function(dojo, _dd, _ddl){

	dojo.experimental("dojox.date.timezone");
	dojo.getObject("date.timezone", true, dojox);

	var cfg = dojo.config;
	var _zoneFiles = [ "africa", "antarctica", "asia", "australasia", "backward",
					"etcetera", "europe", "northamerica", "pacificnew",
					"southamerica" ];
					
	// Our mins an maxes for years that we care about
	var _minYear = 1835,
		_maxYear = 2038;
	
	var _loadedZones = {},
		_zones = {},
		_loadedRanges = {},
		_rules = {};
	
	// loadingScheme: String
	//		One of "preloadAll", "lazyLoad" (Defaults "lazyLoad")
	var loadingScheme = cfg.timezoneLoadingScheme || "preloadAll";
		
	// defaultZoneFile: String or String[]
	//		The default file (or files) to load on startup - other files will
	//		be lazily-loaded on-demand
	var defaultZoneFile = cfg.defaultZoneFile ||
					((loadingScheme == "preloadAll") ? _zoneFiles : "northamerica");

	// Set our olson-zoneinfo content handler
	dojo._contentHandlers["olson-zoneinfo"] = function(xhr){
		var str = dojo._contentHandlers["text"](xhr),
			s = "",
			lines = str.split("\n"),
			arr = [],
			chunk = "",
			zone = null,
			rule = null,
			ret = {zones: {}, rules: {}};

		for(var i = 0; i < lines.length; i++){
			var l = lines[i];
			if(l.match(/^\s/)){
				l = "Zone " + zone + l;
			}
			l = l.split("#")[0];
			if(l.length > 3){
				arr = l.split(/\s+/);
				chunk = arr.shift();
				switch(chunk){
					case 'Zone':
						zone = arr.shift();
						if(arr[0]){
							// Handle extra commas in the middle of a zone
							if(!ret.zones[zone]){ ret.zones[zone] = []; }
							ret.zones[zone].push(arr);
						}
						break;
					case 'Rule':
						rule = arr.shift();
						if(!ret.rules[rule]){ ret.rules[rule] = []; }
						ret.rules[rule].push(arr);
						break;
					case 'Link':
						// No zones for these should already exist
						if(ret.zones[arr[1]]){
						  throw new Error('Error with Link ' + arr[1]);
						}
						// Create the link
						ret.zones[arr[1]] = arr[0];
						break;
					case 'Leap':
						break;
					default:
						// Fail silently
						break;
				}
			}
		}
		return ret; // Object
	};
	
	function loadZoneData(/* Object */ data){
		// summary:
		//		Loads the given data object into the zone database
		// data: Object
		//		The data to load - contains "zones" and "rules" parameters
		data = data || {};
		_zones = dojo.mixin(_zones, data.zones||{});
		_rules = dojo.mixin(_rules, data.rules||{});
	}
	
	function loadZoneFile(/* String */ fileName){
		// summary:
		//		Loads the given URL of the Olson zone information into the
		//		zone database
		//
		// fileName: String
		//		The zoneinfo file name to load
		
		// TODO: Maybe behave similar to requireLocalization - rather than
		//		Using dojo.xhrGet?
		_loadedZones[fileName] = true;
		dojo.xhrGet({
			url: require.toUrl((cfg.timezoneFileBasePath || "dojox/date/zoneinfo") + "/" + fileName),
			sync: true, // Needs to be synchronous so we can return values
			handleAs: "olson-zoneinfo",
			load: loadZoneData,
			error: function(e){
				console.error("Error loading zone file:", e);
				throw e;
			}
		});
	}
	
	var monthMap = { 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3,'may': 4, 'jun': 5,
				'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11 },
		dayMap = {'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4,
				'fri': 5, 'sat': 6 },
		regionMap = {'EST': "northamerica", 'MST': "northamerica",
					'HST': "northamerica", 'EST5EDT': "northamerica",
					'CST6CDT': "northamerica", 'MST7MDT': "northamerica",
					'PST8PDT': "northamerica", 'America': "northamerica",
					'Pacific': "australasia", 'Atlantic': "europe",
					'Africa': "africa", 'Indian': "africa",
					'Antarctica': "antarctica", 'Asia': "asia",
					'Australia': "australasia", 'Europe': "europe",
					'WET': "europe", 'CET': "europe", 'MET': "europe",
					'EET': "europe"},
		regionExceptions = {'Pacific/Honolulu':"northamerica",
							'Atlantic/Bermuda':"northamerica",
							'Atlantic/Cape_Verde':"africa",
							'Atlantic/St_Helena':"africa",
							'Indian/Kerguelen':"antarctica",
							'Indian/Chagos':"asia",
							'Indian/Maldives':"asia",
							'Indian/Christmas':"australasia",
							'Indian/Cocos':"australasia",
							'America/Danmarkshavn':"europe",
							'America/Scoresbysund':"europe",
							'America/Godthab':"europe",
							'America/Thule':"europe",
							'Asia/Yekaterinburg':"europe",
							'Asia/Omsk':"europe",
							'Asia/Novosibirsk':"europe",
							'Asia/Krasnoyarsk':"europe",
							'Asia/Irkutsk':"europe",
							'Asia/Yakutsk':"europe",
							'Asia/Vladivostok':"europe",
							'Asia/Sakhalin':"europe",
							'Asia/Magadan':"europe",
							'Asia/Kamchatka':"europe",
							'Asia/Anadyr':"europe",
							'Africa/Ceuta':"europe",
							'America/Argentina/Buenos_Aires':"southamerica",
							'America/Argentina/Cordoba':"southamerica",
							'America/Argentina/Tucuman':"southamerica",
							'America/Argentina/La_Rioja':"southamerica",
							'America/Argentina/San_Juan':"southamerica",
							'America/Argentina/Jujuy':"southamerica",
							'America/Argentina/Catamarca':"southamerica",
							'America/Argentina/Mendoza':"southamerica",
							'America/Argentina/Rio_Gallegos':"southamerica",
							'America/Argentina/Ushuaia':"southamerica",
							'America/Aruba':"southamerica",
							'America/La_Paz':"southamerica",
							'America/Noronha':"southamerica",
							'America/Belem':"southamerica",
							'America/Fortaleza':"southamerica",
							'America/Recife':"southamerica",
							'America/Araguaina':"southamerica",
							'America/Maceio':"southamerica",
							'America/Bahia':"southamerica",
							'America/Sao_Paulo':"southamerica",
							'America/Campo_Grande':"southamerica",
							'America/Cuiaba':"southamerica",
							'America/Porto_Velho':"southamerica",
							'America/Boa_Vista':"southamerica",
							'America/Manaus':"southamerica",
							'America/Eirunepe':"southamerica",
							'America/Rio_Branco':"southamerica",
							'America/Santiago':"southamerica",
							'Pacific/Easter':"southamerica",
							'America/Bogota':"southamerica",
							'America/Curacao':"southamerica",
							'America/Guayaquil':"southamerica",
							'Pacific/Galapagos':"southamerica",
							'Atlantic/Stanley':"southamerica",
							'America/Cayenne':"southamerica",
							'America/Guyana':"southamerica",
							'America/Asuncion':"southamerica",
							'America/Lima':"southamerica",
							'Atlantic/South_Georgia':"southamerica",
							'America/Paramaribo':"southamerica",
							'America/Port_of_Spain':"southamerica",
							'America/Montevideo':"southamerica",
							'America/Caracas':"southamerica"},
		abbrExceptions = { 'US': "S", 'Chatham': "S", 'NZ': "S", 'NT_YK': "S",
							'Edm': "S", 'Salv': "S", 'Canada': "S", 'StJohns': "S",
							'TC': "S", 'Guat': "S", 'Mexico': "S", 'Haiti': "S",
							'Barb': "S", 'Belize': "S", 'CR': "S", 'Moncton': "S",
							'Swift': "S", 'Hond': "S", 'Thule': "S", 'NZAQ': "S",
							'Zion': "S", 'ROK': "S", 'PRC': "S", 'Taiwan': "S",
							'Ghana': "GMT", 'SL': "WAT", 'Chicago': "S",
							'Detroit': "S", 'Vanc': "S", 'Denver': "S",
							'Halifax': "S", 'Cuba': "S", 'Indianapolis': "S",
							'Starke': "S", 'Marengo': "S", 'Pike': "S",
							'Perry': "S", 'Vincennes': "S", 'Pulaski': "S",
							'Louisville': "S", 'CA': "S", 'Nic': "S",
							'Menominee': "S", 'Mont': "S", 'Bahamas': "S",
							'NYC': "S", 'Regina': "S", 'Resolute': "ES",
							'DR': "S", 'Toronto': "S", 'Winn': "S" };
	
	function invalidTZError(t) {
		throw new Error('Timezone "' + t +
				'" is either incorrect, or not loaded in the timezone registry.');
	}
	
	function getRegionForTimezone(/* String */ tz) {
		// summary:
		//		Returns the Olson region for the given timezone
		var ret = regionExceptions[tz];
		if(!ret){
			var reg = tz.split('/')[0];
			ret = regionMap[reg];
			// If there's nothing listed in the main regions for
			// this TZ, check the 'backward' links
			if(!ret){
				var link = _zones[tz];
				if(typeof link == 'string'){
					return getRegionForTimezone(link); // String
				}else{
					// Backward-compat file hasn't loaded yet, try looking in there
					if (!_loadedZones.backward) {
						// This is for obvious legacy zones (e.g., Iceland) that
						// don't even have a prefix like "America/" that look like
						// normal zones
						loadZoneFile("backward");
						return getRegionForTimezone(tz); // String
					}else{
						invalidTZError(tz);
					}
				}
			}
		}
		return ret; // String
	}
	
	function parseTimeString(/* String */ str) {
		// summary:
		//		Parses the given time string and returns it as an integer array
		var pat = /(\d+)(?::0*(\d*))?(?::0*(\d*))?([su])?$/;
		var hms = str.match(pat);
		if(!hms){
			return null;
		}
		hms[1] = parseInt(hms[1], 10);
		hms[2] = hms[2] ? parseInt(hms[2], 10) : 0;
		hms[3] = hms[3] ? parseInt(hms[3], 10) : 0;
		return hms; // int[]
	}
	
	function getUTCStamp(/* int */ y, /* int */ m, /* int */ d, /* int */ h,
						/* int */ mn, /* int */ s, /* int? */ off){
		// summary:
		//		Returns the UTC timestamp, adjusted by the given (optional) offset
		return Date.UTC(y, m, d, h, mn, s) + ((off||0) * 60 * 1000);
	}
	
	function getMonthNumber(/* String */ m){
		// summary:
		//		Returns the javascript month number for the given string
		return monthMap[m.substr(0, 3).toLowerCase()];
	}
	
	function getOffsetInMins(/* String */ str){
		// summary:
		//		Returns the offset value represented by the string, in minutes
		var off = parseTimeString(str);
		if(off === null){ return 0; }
		var adj = str.indexOf('-') === 0 ? -1 : 1;
		off = adj * (((off[1] * 60 + off[2]) *60 + off[3]) * 1000);
		return -off/60/1000;
	}

	function _getRuleStart(/* Rule */ rule, /* int */ year, /* int */ off){
		// summary:
		//		Returns a date that the rule begins matching in the given year.
		var month = getMonthNumber(rule[3]),
			day = rule[4],
			time = parseTimeString(rule[5]);
		if(time[4] == "u"){
			// We are UTC - so there is no offset to use
			off = 0;
		}
		
		var d, dtDay, incr;
		if(isNaN(day)){
			if(day.substr(0, 4) == "last"){
				// Last day of the month at the desired time of day
				day = dayMap[day.substr(4,3).toLowerCase()];
				d = new Date(getUTCStamp(year, month + 1, 1,
										time[1] - 24, time[2], time[3],
										off));
				dtDay = _dd.add(d, "minute", -off).getUTCDay();
				// Set it to the final day of the correct weekday that month
				incr = (day > dtDay) ? (day - dtDay - 7) : (day - dtDay);
				if(incr !== 0){
					d = _dd.add(d, "hour", incr * 24);
				}
				return d;
			}else{
				day = dayMap[day.substr(0, 3).toLowerCase()];
				if(day != "undefined"){
					if(rule[4].substr(3, 2) == '>='){
						// The stated date of the month
						d = new Date(getUTCStamp(year, month, parseInt(rule[4].substr(5), 10),
									time[1], time[2], time[3], off));
						dtDay = _dd.add(d, "minute", -off).getUTCDay();
						// Set to the first correct weekday after the stated date
						incr = (day < dtDay) ? (day - dtDay + 7) : (day - dtDay);
						if(incr !== 0){
							d = _dd.add(d, "hour", incr * 24);
						}
						return d;
					}else if(day.substr(3, 2) == '<='){
						// The stated date of the month
						d = new Date(getUTCStamp(year, month, parseInt(rule[4].substr(5), 10),
									time[1], time[2], time[3], off));
						dtDay = _dd.add(d, "minute", -off).getUTCDay();
						// Set to first correct weekday before the stated date
						incr = (day > dtDay) ? (day - dtDay - 7) : (day - dtDay);
						if(incr !== 0){
							d = _dd.add(d, "hour", incr * 24);
						}
						return d;
					}
				}
			}
		}else{
			// Numeric date
			d = new Date(getUTCStamp(year, month, parseInt(day, 10),
						time[1], time[2], time[3], off));
			return d;
		}
		return null;
	}

	function _getRulesForYear(/* Zone */ zone, /* int */ year){
		var rules = [];
		dojo.forEach(_rules[zone[1]]||[], function(r){
			// Clean up rules as needed
			for(var i = 0; i < 2; i++){
				switch(r[i]){
					case "min":
						r[i] = _minYear;
						break;
					case "max":
						r[i] = _maxYear;
						break;
					case "only":
						break;
					default:
						r[i] = parseInt(r[i], 10);
						if(isNaN(r[i])){
							throw new Error('Invalid year found on rule');
						}
						break;
				}
			}
			if(typeof r[6] == "string"){
				// Change our offset to be an integer
				r[6] = getOffsetInMins(r[6]);
			}
			
			// Quick-filter to grab all rules that match my year
			if((r[0] <= year && r[1] >= year) || // Matches my y
				(r[0] == year && r[1] == "only")){ // Matches my only
				rules.push({r: r, d: _getRuleStart(r, year, zone[0])});
			}
		});
		return rules;
	}


	function _loadZoneRanges(/* String */ tz, /* Object[] */ zoneList) {
		// summary:
		//		Loads the zone ranges for the given timezone
		
		var zr = _loadedRanges[tz] = [];
		for(var i = 0; i < zoneList.length; i++){
			var z = zoneList[i];
			var r = zr[i] = [];
			var prevZone = null;
			var prevRange = null;
			var prevRules = [];
			
			// Set up our zone offset to not be a string anymore
			if(typeof z[0] == "string"){
				z[0] = getOffsetInMins(z[0]);
			}
			
			if(i === 0){
				// The beginning of zoneinfo time - let's not worry about
				// to-the-hour accuracy before Jan 1, 1835
				r[0] = Date.UTC(_minYear,0,1,0,0,0,0);
			}else{
				r[0] = zr[i - 1][1];
				prevZone = zoneList[i - 1];
				prevRange = zr[i - 1];
				prevRules = prevRange[2];
			}

			// Load the rules that will be going in to our zone
			var startYear = new Date(r[0]).getUTCFullYear();
			var endYear = z[3] ? parseInt(z[3], 10) : _maxYear;
			var rlz = [];
			var j;
			for(j = startYear; j <= endYear; j++){
				rlz = rlz.concat(_getRulesForYear(z, j));
			}
			rlz.sort(function(a, b){
				return _dd.compare(a.d, b.d);
			});
			var rl;
			for(j = 0, rl; (rl = rlz[j]); j++){
				var prevRule = j > 0 ? rlz[j - 1] : null;
				if(rl.r[5].indexOf("u") < 0 && rl.r[5].indexOf("s") < 0){
					if(j === 0 && i > 0){
						if(prevRules.length){
							// We have a previous rule - so use it
							rl.d = _dd.add(rl.d, "minute", prevRules[prevRules.length - 1].r[6]);
						}else if(_dd.compare(new Date(prevRange[1]), rl.d, "date") === 0){
							// No previous rules - but our date is the same as the
							// previous zone ended on - so use that.
							rl.d = new Date(prevRange[1]);
						}else{
							rl.d = _dd.add(rl.d, "minute", getOffsetInMins(prevZone[1]));
						}
					}else if(j > 0){
						rl.d = _dd.add(rl.d, "minute", prevRule.r[6]);
					}
				}
			}
			r[2] = rlz;

			if(!z[3]){
				// The end of zoneinfo time - we'll cross this bridge when we
				// get close to Dec 31, 2038
				r[1] = Date.UTC(_maxYear,11,31,23,59,59,999);
			}else{
				var year = parseInt(z[3], 10),
					month = getMonthNumber(z[4]||"Jan"),
					day = parseInt(z[5]||"1", 10),
					time = parseTimeString(z[6]||"0");
				var utcStmp = r[1] = getUTCStamp(year, month, day,
									time[1], time[2], time[3],
									((time[4] == "u") ? 0 : z[0]));
				if(isNaN(utcStmp)){
					utcStmp = r[1] = _getRuleStart([0,0,0,z[4],z[5],z[6]||"0"],
											year, ((time[4] == "u") ? 0 : z[0])).getTime();
				}
				var matches = dojo.filter(rlz, function(rl, idx){
					var o = idx > 0 ? rlz[idx - 1].r[6] * 60 * 1000 : 0;
					return (rl.d.getTime() < utcStmp + o);
				});
				if(time[4] != "u" && time[4] != "s"){
					if(matches.length){
						r[1] += matches[matches.length - 1].r[6] * 60 * 1000;
					}else{
						r[1] += getOffsetInMins(z[1]) * 60 * 1000;
					}
				}
			}
		}
	}
	
	function getZoneInfo(/* String */ dt, /* String */ tz) {
		// summary:
		//		Returns the zone entry from the zoneinfo database for the given date
		//		and timezone
		var t = tz;
		var zoneList = _zones[t];

		// Follow links to get to an actual zone
		while(typeof zoneList == "string"){
			t = zoneList;
			zoneList = _zones[t];
		}
		if(!zoneList){
			// Backward-compat file hasn't loaded yet, try looking in there
			if(!_loadedZones.backward){
				// This is for backward entries like "America/Fort_Wayne" that
				// getRegionForTimezone *thinks* it has a region file and zone
				// for (e.g., America => 'northamerica'), but in reality it's a
				// legacy zone we need the backward file for
				var parsed = loadZoneFile("backward", true);
				return getZoneInfo(dt, tz); //Object
			}
			invalidTZError(t);
		}
		
		if(!_loadedRanges[tz]){
			_loadZoneRanges(tz, zoneList);
		}
		var ranges = _loadedRanges[tz];
		var tm = dt.getTime();
		for(var i = 0, r; (r = ranges[i]); i++){
			if(tm >= r[0] && tm < r[1]){
				return {zone: zoneList[i], range: ranges[i], idx: i};
			}
		}
		throw new Error('No Zone found for "' + tz + '" on ' + dt);
	}
	
	function getRule(/* Date */ dt, /* ZoneInfo */ zoneInfo) {
 		// summary:
		//		Returns the latest-matching rule entry from the zoneinfo
		//		database for the given date and zone
		
		var lastMatch = -1;
		var rules = zoneInfo.range[2]||[];
		var tsp = dt.getTime();
		var zr = zoneInfo.range;
		for(var i = 0, r; (r = rules[i]); i++){
			if(tsp >= r.d.getTime()){
				lastMatch = i;
			}
		}
		if(lastMatch >= 0){
			return rules[lastMatch].r;
		}
		return null;
	}
  
	function getAbbreviation(/* String */ tz, /* Object */ zoneInfo, /* Object */ rule) {
		// summary:
		//		Returns the abbreviation for the given zone and rule
		var res;
		var zone = zoneInfo.zone;
		var base = zone[2];
		if(base.indexOf('%s') > -1){
			var repl;
			if(rule){
				repl = rule[7];
				if(repl == "-"){ repl = ""; }
			}else if(zone[1] in abbrExceptions){
				repl = abbrExceptions[zone[1]];
			}else{
				if(zoneInfo.idx > 0){
					// Check if our previous zone's base is the same as our
					// current in "S" (standard) mode.  If so, then use "S"
					// for our replacement
					var pz = _zones[tz][zoneInfo.idx - 1];
					var pb = pz[2];
					if(pb.indexOf('%s') < 0){
						if(base.replace('%s', "S") == pb){
							repl = "S";
						}else{
							repl = "";
						}
					}else{
						repl = "";
					}
				}else{
					repl = "";
				}
			}
			res = base.replace('%s', repl);
		}else if(base.indexOf("/") > -1){
			var bs = base.split("/");
			if(rule){
				res = bs[rule[6] === 0 ? 0 : 1];
			}else{
				res = bs[0];
			}
		}else{
			res = base;
		}
		return res; // String
	}
	
/*=====

// TODO: none of this is AMD friendly.   It's setting global variables in dojox,and not returning anything from the module.
// Plus, the override of dojo/date/locale's format() and _getZone() below.   This needs to be refactored.

dojox.date.timezone = function(){
	// summary:
	//		mix-in to dojo.date to provide timezones based on
	//		the Olson timezone data
	// description:
	//		mix-in to dojo.date to provide timezones based on
	//		the Olson timezone data.
	//		If you pass "timezone" as a parameter to your format options,
	//		then you get the date formatted (and offset) for that timezone

//TODOC
};

dojox.date.timezone.getTzInfo = function(dt, tz){
	// summary:
	//		Returns the timezone information for the given date and
	//		timezone string
	// dt: Date
	//		The Date - a "proxyDate"
	// tz: String
	//		String representation of the timezone you want to get info
	//		for date
};

dojox.date.timezone.loadZoneData = function(data){
	// summary:
	//		Loads the given data object into the zone database
	// data: Object
	//		The data to load - contains "zones" and "rules" parameters
};

dojox.date.timezone.getAllZones = function(){
	// summary:
	//		Returns an array of zones that have been loaded
};
=====*/
	dojo.setObject("dojox.date.timezone", {
		getTzInfo: function(/* Date */ dt, /* String */ tz){
			// Lazy-load any zones not yet loaded
			if(loadingScheme == "lazyLoad"){
				// Get the correct region for the zone
				var zoneFile = getRegionForTimezone(tz);
				if(!zoneFile){
					throw new Error("Not a valid timezone ID.");
				}else{
					if(!_loadedZones[zoneFile]){
						// Get the file and parse it -- use synchronous XHR
						loadZoneFile(zoneFile);
					}
				}
			}
			var zoneInfo = getZoneInfo(dt, tz);
			var off = zoneInfo.zone[0];
			// See if the offset needs adjustment
			var rule = getRule(dt, zoneInfo);
			if(rule){
				off += rule[6];
			}else{
				if(_rules[zoneInfo.zone[1]] && zoneInfo.idx > 0){
					off += getOffsetInMins(_zones[tz][zoneInfo.idx - 1][1]);
				}else{
					off += getOffsetInMins(zoneInfo.zone[1]);
				}
			}

			var abbr = getAbbreviation(tz, zoneInfo, rule);
			return { tzOffset: off, tzAbbr: abbr }; // Object
		},
		loadZoneData: function(data){
			loadZoneData(data);
		},
		getAllZones: function(){
			var arr = [];
			for(var z in _zones){ arr.push(z); }
			arr.sort();
			return arr; // String[]
		}
	});
	
	// Now - initialize the stuff that we should have pre-loaded
	if(typeof defaultZoneFile == "string" && defaultZoneFile){
		defaultZoneFile = [defaultZoneFile];
	}
	if(dojo.isArray(defaultZoneFile)){
		dojo.forEach(defaultZoneFile, loadZoneFile);
	}
	
	// And enhance the default formatting functions
	// If you pass "timezone" as a parameter to your format options,
	// then you get the date formatted (and offset) for that timezone
	var oLocaleFmt = _ddl.format,
		oGetZone = _ddl._getZone;
	_ddl.format = function(dateObject, options){
		options = options||{};
		if(options.timezone && !options._tzInfo){
			// Store it in our options so we can use it later
			options._tzInfo = dojox.date.timezone.getTzInfo(dateObject, options.timezone);
		}
		if(options._tzInfo){
			// Roll our date to display the correct time according to the
			// desired offset
			var offset = dateObject.getTimezoneOffset() - options._tzInfo.tzOffset;
			dateObject = new Date(dateObject.getTime() + (offset * 60 * 1000));
		}
		return oLocaleFmt.call(this, dateObject, options);
	};
	_ddl._getZone = function(dateObject, getName, options){
		if(options._tzInfo){
			return getName ? options._tzInfo.tzAbbr : options._tzInfo.tzOffset;
		}
		return oGetZone.call(this, dateObject, getName, options);
	};

	/*=====
	// Hide these enhancements from the doc parser because they obscure the original definition of _getZone() and
	// format.   TODO: change above overrides to around() advice so that original definitions aren't changed.
	 _ddl.format = oLocaleFmt;
	 _ddl._getZone = oGetZone;
	=====*/
});
