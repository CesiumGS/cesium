define(["dojo/_base/kernel", "dojo/_base/lang","dojo/date","dojox/string/tokenize"], function(dojo,dlang,ddate,dxst){
dojo.getObject("date.php", true, dojox);

dojox.date.php.format = function(/*Date*/ date, /*String*/ format){
	// summary:
	//		Get a formatted string for a given date object
	var df = new dojox.date.php.DateFormat(format);
	return df.format(date);
};

dojox.date.php.DateFormat = function(/*String*/ format){
	// summary:
	//		Format the internal date object
	if(!this.regex){
		var keys = [];
		for(var key in this.constructor.prototype){
			if(dojo.isString(key) && key.length == 1 && dojo.isFunction(this[key])){
				keys.push(key);
			}
		}
		this.constructor.prototype.regex = new RegExp("(?:(\\\\.)|([" + keys.join("") + "]))", "g");
	}

	var replacements = [];

	this.tokens = dxst(format, this.regex, function(escape, token, i){
		if(token){
			replacements.push([i, token]);
			return token;
		}
		if(escape){
			return escape.charAt(1);
		}
	});

	this.replacements = replacements;
};

dojo.extend(dojox.date.php.DateFormat, {
	weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	weekdays_3: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
	months_3: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	monthdays: [31,28,31,30,31,30,31,31,30,31,30,31],

	format: function(/*Date*/ date){
		this.date = date;
		for(var i = 0, replacement; replacement = this.replacements[i]; i++){
			this.tokens[replacement[0]] = this[replacement[1]]();
		}
		return this.tokens.join("");
	},

	// Day

	d: function(){
		// summary:
		//		Day of the month, 2 digits with leading zeros
		var j = this.j();
		return (j.length == 1) ? "0" + j : j;
	},

	D: function(){
		// summary:
		//		A textual representation of a day, three letters
		return this.weekdays_3[this.date.getDay()];
	},

	j: function(){
		// summary:
		//		Day of the month without leading zeros
		return this.date.getDate() + "";
	},

	l: function(){
		// summary:
		//		A full textual representation of the day of the week
		return this.weekdays[this.date.getDay()];
	},

	N: function(){
		// summary:
		//		ISO-8601 numeric representation of the day of the week (added in PHP 5.1.0)
		var w = this.w();
		return (!w) ? 7 : w;
	},

	S: function(){
		// summary:
		//		English ordinal suffix for the day of the month, 2 characters
		switch(this.date.getDate()){
			case 11: case 12: case 13: return "th";
			case 1: case 21: case 31: return "st";
			case 2: case 22: return "nd";
			case 3: case 23: return "rd";
			default: return "th";
		}
	},

	w: function(){
		// summary:
		//		Numeric representation of the day of the week
		return this.date.getDay() + "";
	},

	z: function(){
		// summary:
		//		The day of the year (starting from 0)
		var millis = this.date.getTime() - new Date(this.date.getFullYear(), 0, 1).getTime();
		return Math.floor(millis/86400000) + "";
	},

	// Week

	W: function(){
		// summary:
		//		ISO-8601 week number of year, weeks starting on Monday (added in PHP 4.1.0)
		var week;
		var jan1_w = new Date(this.date.getFullYear(), 0, 1).getDay() + 1;
		var w = this.date.getDay() + 1;
		var z = parseInt(this.z());

		if(z <= (8 - jan1_w) && jan1_w > 4){
			var last_year = new Date(this.date.getFullYear() - 1, this.date.getMonth(), this.date.getDate());
			if(jan1_w == 5 || (jan1_w == 6 && ddate.isLeapYear(last_year))){
				week = 53;
			}else{
				week = 52;
			}
		}else{
			var i;
			if(Boolean(this.L())){
				i = 366;
			}else{
				i = 365;
			}
			if((i - z) < (4 - w)){
				week = 1;
			}else{
				var j = z + (7 - w) + (jan1_w - 1);
				week = Math.ceil(j / 7);
				if(jan1_w > 4){
					--week;
				}
			}
		}

		return week;
	},

	// Month

	F: function(){
		// summary:
		//		A full textual representation of a month, such as January or March
		return this.months[this.date.getMonth()];
	},

	m: function(){
		// summary:
		//		Numeric representation of a month, with leading zeros
		var n = this.n();
		return (n.length == 1) ? "0" + n : n;
	},

	M: function(){
		// summary:
		//		A short textual representation of a month, three letters
		return this.months_3[this.date.getMonth()];
	},

	n: function(){
		// summary:
		//		Numeric representation of a month, without leading zeros
		return this.date.getMonth() + 1 + "";
	},

	t: function(){
		// summary:
		//		Number of days in the given month
		return (Boolean(this.L()) && this.date.getMonth() == 1) ? 29 : this.monthdays[this.getMonth()];
	},

	// Year

	L: function(){
		// summary:
		//		Whether it's a leap year
		return (ddate.isLeapYear(this.date)) ? "1" : "0";
	},

	o: function(){
		// summary:
		//		ISO-8601 year number. This has the same value as Y, except that if
		//		the ISO week number (W) belongs to the previous or next year, that year is used instead. (added in PHP 5.1.0)

		// TODO: Figure out what this means
	},

	Y: function(){
		// summary:
		//		A full numeric representation of a year, 4 digits
		return this.date.getFullYear() + "";
	},

	y: function(){
		// summary:
		//		A two digit representation of a year
		return this.Y().slice(-2);
	},

	// Time

	a: function(){
		// summary:
		//		Lowercase Ante meridian and Post meridian
		return this.date.getHours() >= 12 ? "pm" : "am";
	},

	b: function(){
		// summary:
		//		Uppercase Ante meridian and Post meridian
		return this.a().toUpperCase();
	},

	B: function(){
		// summary:
		//		Swatch Internet time
		//		A day is 1,000 beats. All time is measured from GMT + 1
		var off = this.date.getTimezoneOffset() + 60;
		var secs = (this.date.getHours() * 3600) + (this.date.getMinutes() * 60) + this.getSeconds() + (off * 60);
		var beat = Math.abs(Math.floor(secs / 86.4) % 1000) + "";
		while(beat.length <  2) beat = "0" + beat;
		return beat;
	},

	g: function(){
		// summary:
		//		12-hour format of an hour without leading zeros
		return (this.date.getHours() % 12 || 12) + "";
	},

	G: function(){
		// summary:
		//		24-hour format of an hour without leading zeros
		return this.date.getHours() + "";
	},

	h: function(){
		// summary:
		//		12-hour format of an hour with leading zeros
		var g = this.g();
		return (g.length == 1) ? "0" + g : g;
	},

	H: function(){
		// summary:
		//		24-hour format of an hour with leading zeros
		var G = this.G();
		return (G.length == 1) ? "0" + G : G;
	},

	i: function(){
		// summary:
		//		Minutes with leading zeros
		var mins = this.date.getMinutes() + "";
		return (mins.length == 1) ? "0" + mins : mins;
	},

	s: function(){
		// summary:
		//		Seconds, with leading zeros
		var secs = this.date.getSeconds() + "";
		return (secs.length == 1) ? "0" + secs : secs;
	},

	// Timezone

	e: function(){
		// summary:
		//		Timezone identifier (added in PHP 5.1.0)
		return ddate.getTimezoneName(this.date);
	},

	I: function(){
		// summary:
		//		Whether or not the date is in daylight saving time

		// TODO: Can dojo.date do this?
	},

	O: function(){
		// summary:
		//		Difference to Greenwich time (GMT) in hours
		var off = Math.abs(this.date.getTimezoneOffset());
		var hours = Math.floor(off / 60) + "";
		var mins = (off % 60) + "";
		if(hours.length == 1) hours = "0" + hours;
		if(mins.length == 1) hours = "0" + mins;
		return ((this.date.getTimezoneOffset() < 0) ? "+" : "-") + hours + mins;
	},

	P: function(){
		// summary:
		//		Difference to Greenwich time (GMT) with colon between hours and minutes (added in PHP 5.1.3)
		var O = this.O();
		return O.substring(0, 2) + ":" + O.substring(2, 4);
	},

	T: function(){
		// summary:
		//		Timezone abbreviation

		// Guess...
		return this.e().substring(0, 3);
	},

	Z: function(){
		// summary:
		//		Timezone offset in seconds. The offset for timezones west of UTC is always negative,
		//		and for those east of UTC is always positive.
		return this.date.getTimezoneOffset() * -60;
	},

	// Full Date/Time

	c: function(){
		// summary:
		//		ISO 8601 date (added in PHP 5)
		return this.Y() + "-" + this.m() + "-" + this.d() + "T" + this.h() + ":" + this.i() + ":" + this.s() + this.P();
	},

	r: function(){
		// summary:
		//		RFC 2822 formatted date
		return this.D() + ", " + this.d() + " " + this.M() + " " + this.Y() + " " + this.H() + ":" + this.i() + ":" + this.s() + " " + this.O();
	},

	U: function(){
		// summary:
		//		Seconds since the Unix Epoch (January 1 1970 00:00:00 GMT)
		return Math.floor(this.date.getTime() / 1000);
	}

});
return dojox.date.php;
});