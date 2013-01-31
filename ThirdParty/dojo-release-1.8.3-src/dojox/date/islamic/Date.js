define(["dojo/_base/lang", "dojo/_base/declare", "dojo/date"], function(lang, declare, dd){

	var IDate = declare("dojox.date.islamic.Date", null, {
	// summary:
	//		The component defines the Islamic (Hijri) Calendar Object
	// description:
	//		This module is similar to the Date() object provided by JavaScript
	// example:
	//	|	var date = new dojox.date.islamic.Date();
	//	|	document.writeln(date.getFullYear()+'\'+date.getMonth()+'\'+date.getDate());


	_date: 0,
	_month: 0,
	_year: 0,
	_hours: 0,
	_minutes: 0,
	_seconds: 0,
	_milliseconds: 0,
	_day: 0,
	_GREGORIAN_EPOCH : 1721425.5,
	_ISLAMIC_EPOCH : 1948439.5,

	constructor: function(){
		// summary:
		//		This is the constructor
		// description:
		//		This function initialize the date object values
		// example:
		//	|	var date1 = new dojox.date.islamic.Date();
		//	|	var date2 = new dojox.date.islamic.Date("12\2\1429");
		//	|	var date3 = new dojox.date.islamic.Date(date2);
		//	|	var date4 = new dojox.date.islamic.Date(1429,2,12);

		var len = arguments.length;
		if(!len){// use the current date value, added "" to the similarity to date
			this.fromGregorian(new Date());
		}else if(len == 1){
			var arg0 = arguments[0];
			if(typeof arg0 == "number"){ // this is time "valueof"
				arg0 = new Date(arg0);
			}

			if(arg0 instanceof Date){
				this.fromGregorian(arg0);
			}else if(arg0 == ""){
				// date should be invalid.  Dijit relies on this behavior.
				this._date = new Date(""); //TODO: should this be NaN?  _date is not a Date object
			}else{  // this is Islamic.Date object
				this._year = arg0._year;
				this._month =  arg0._month;
				this._date = arg0._date;
				this._hours = arg0._hours;
				this._minutes = arg0._minutes;
				this._seconds = arg0._seconds;
				this._milliseconds = arg0._milliseconds;
			}
		}else if(len >=3){
			// YYYY MM DD arguments passed, month is from 0-12
			this._year += arguments[0];
			this._month += arguments[1];
			this._date += arguments[2];
			this._hours += arguments[3] || 0;
			this._minutes += arguments[4] || 0;
			this._seconds += arguments[5] || 0;
			this._milliseconds += arguments[6] || 0;
		}
	},

	getDate:function(){
		// summary:
		//		This function returns the date value (1 - 30)
		// example:
		//	|	var date1 = new dojox.date.islamic.Date();
		//	|	document.writeln(date1.getDate);
		return this._date;
	},
	
	getMonth:function(){
		// summary:
		//		This function return the month value ( 0 - 11 )
		// example:
		//	|	var date1 = new dojox.date.islamic.Date();
		//	|	document.writeln(date1.getMonth()+1);

		return this._month;
	},

	getFullYear:function(){
		// summary:
		//		This function return the Year value
		// example:
		//	|	var date1 = new dojox.date.islamic.Date();
		//	|	document.writeln(date1.getFullYear());

		return this._year;
	},
		
	getDay:function(){
		// summary:
		//		This function return Week Day value ( 0 - 6 )
		// example:
		//	|	var date1 = new dojox.date.islamic.Date();
		//	|	document.writeln(date1.getDay());

		return this.toGregorian().getDay();
	},
		
	getHours:function(){
		// summary:
		//		returns the Hour value
		return this._hours;
	},
	
	getMinutes:function(){
		// summary:
		//		returns the Minutes value
		return this._minutes;
	},

	getSeconds:function(){
		// summary:
		//		returns the seconds value
		return this._seconds;
	},

	getMilliseconds:function(){
		// summary:
		//		returns the Milliseconds value
		return this._milliseconds;
	},

	setDate: function(/*number*/date){
		// summary:
		//		This function sets the Date
		// example:
		//	|	var date1 = new dojox.date.islamic.Date();
		//	|	date1.setDate(2);

		date = parseInt(date);

		if(date > 0 && date <= this.getDaysInIslamicMonth(this._month, this._year)){
			this._date = date;
		}else{
			var mdays;
			if(date>0){
				for(mdays = this.getDaysInIslamicMonth(this._month, this._year);
					date > mdays;
						date -= mdays,mdays =this.getDaysInIslamicMonth(this._month, this._year)){
					this._month++;
					if(this._month >= 12){this._year++; this._month -= 12;}
				}

				this._date = date;
			}else{
				for(mdays = this.getDaysInIslamicMonth((this._month-1)>=0 ?(this._month-1) :11 ,((this._month-1)>=0)? this._year: this._year-1);
						date <= 0;
							mdays = this.getDaysInIslamicMonth((this._month-1)>=0 ? (this._month-1) :11,((this._month-1)>=0)? this._year: this._year-1)){
					this._month--;
					if(this._month < 0){this._year--; this._month += 12;}

					date+=mdays;
				}
				this._date = date;
			}
		}
		return this;
	},

	setFullYear:function(/*number*/year){
		// summary:
		//		This function set Year
		// example:
		//	|	var date1 = new dojox.date.islamic.Date();
		//	|	date1.setYear(1429);

		this._year = +year;
	},

	setMonth: function(/*number*/month) {
		// summary:
		//		This function set Month
		// example:
		//	|	var date1 = new dojox.date.islamic.Date();
		//	|	date1.setMonth(2);

		this._year += Math.floor(month / 12);
		if(month > 0){
			this._month = Math.floor(month % 12);
		}else{
			this._month = Math.floor(((month % 12) + 12) % 12);
		}
	},

	setHours:function(){
		// summary:
		//		set the Hours
		var hours_arg_no = arguments.length;
		var hours = 0;
		if(hours_arg_no >= 1){
			hours = parseInt(arguments[0]);
		}

		if(hours_arg_no >= 2){
			this._minutes = parseInt(arguments[1]);
		}

		if(hours_arg_no >= 3){
			this._seconds = parseInt(arguments[2]);
		}

		if(hours_arg_no == 4){
			this._milliseconds = parseInt(arguments[3]);
		}

		while(hours >= 24){
			this._date++;
			var mdays = this.getDaysInIslamicMonth(this._month, this._year);
			if(this._date > mdays){
					this._month ++;
					if(this._month >= 12){this._year++; this._month -= 12;}
					this._date -= mdays;
			}
			hours -= 24;
		}
		this._hours = hours;
	},

	_addMinutes: function(/*Number*/minutes){
		minutes += this._minutes;
		this.setMinutes(minutes);
		this.setHours(this._hours + parseInt(minutes / 60));
		return this;
	},

	_addSeconds: function(/*Number*/seconds){
		seconds += this._seconds;
		this.setSeconds(seconds);
		this._addMinutes(parseInt(seconds / 60));
		return this;
	},

	_addMilliseconds: function(/*Number*/milliseconds){
		milliseconds += this._milliseconds;
		this.setMilliseconds(milliseconds);
		this._addSeconds(parseInt(milliseconds / 1000));
		return this;
	},

	setMinutes: function(/*Number*/minutes){
		// summary:
		//		sets the minutes (0-59) only.
		this._minutes = minutes % 60;
		return this;
	},

	setSeconds: function(/*Number*/seconds){
		// summary:
		//		sets the seconds (0-59) only.
		this._seconds = seconds % 60;
		return this;
	},

	setMilliseconds: function(/*Number*/milliseconds){
		this._milliseconds = milliseconds % 1000;
		return this;
	},
		
	toString:function(){
		// summary:
		//		This returns a string representation of the date in "DDDD MMMM DD YYYY HH:MM:SS" format
		// example:
		//	|	var date1 = new dojox.date.islamic.Date();
		//	|	document.writeln(date1.toString());

		//FIXME: TZ/DST issues?
		if(isNaN(this._date)){
			return "Invalidate Date";
		}else{
			var x = new Date();
			x.setHours(this._hours);
			x.setMinutes(this._minutes);
			x.setSeconds(this._seconds);
			x.setMilliseconds(this._milliseconds);
			return this._month+" "+ this._date + " " + this._year + " " + x.toTimeString();
		}
	},
		
		
	toGregorian:function(){
		// summary:
		//		This returns the equevalent Grogorian date value in Date object
		// example:
		//	|	var dateIslamic = new dojox.date.islamic.Date(1429,11,20);
		//	|	var dateGregorian = dateIslamic.toGregorian();

		var hYear = this._year;
		var hMonth = this._month;
		var hDate = this._date;
		var julianDay = hDate + Math.ceil(29.5 * hMonth) + (hYear - 1) * 354
						+ Math.floor((3 + (11 * hYear)) / 30) + this._ISLAMIC_EPOCH - 1;

		var wjd = Math.floor(julianDay - 0.5) + 0.5,
			depoch = wjd - this._GREGORIAN_EPOCH,
			quadricent = Math.floor(depoch / 146097),
			dqc = this._mod(depoch, 146097),
			cent = Math.floor(dqc / 36524),
			dcent = this._mod(dqc, 36524),
			quad = Math.floor(dcent / 1461),
			dquad = this._mod(dcent, 1461),
			yindex = Math.floor(dquad / 365),
			year = (quadricent * 400) + (cent * 100) + (quad * 4) + yindex;
		if(!(cent == 4 || yindex == 4)){
			year++;
		}
		
		var gYearStart = this._GREGORIAN_EPOCH + (365 * (year - 1)) + Math.floor((year - 1) / 4)
						- ( Math.floor((year - 1) / 100)) + Math.floor((year - 1) / 400);
						
		var yearday = wjd - gYearStart;
		
		var tjd = (this._GREGORIAN_EPOCH - 1) + (365 * (year - 1)) + Math.floor((year - 1) / 4)
				-( Math.floor((year - 1) / 100)) + Math.floor((year - 1) / 400) + Math.floor( (739 / 12)
				+ ( (dd.isLeapYear(new Date(year,3,1)) ? -1 : -2)) + 1);
			
		var leapadj = ((wjd < tjd ) ? 0 : (dd.isLeapYear(new Date(year,3,1)) ? 1 : 2));
					
		var month = Math.floor((((yearday + leapadj) * 12) + 373) / 367);
		var tjd2 = (this._GREGORIAN_EPOCH - 1) + (365 * (year - 1))
					+ Math.floor((year - 1) / 4) - (Math.floor((year - 1) / 100))
					+ Math.floor((year - 1) / 400) + Math.floor((((367 * month) - 362) / 12)
					+ ((month <= 2) ? 0 : (dd.isLeapYear(new Date(year,month,1)) ? -1 : -2)) + 1);
					
		var day = (wjd - tjd2) + 1;

		var gdate = new Date(year, (month - 1), day, this._hours, this._minutes, this._seconds, this._milliseconds);

		return gdate;
	},

	//TODO: would it make more sense to make this a constructor option? or a static?
	// ported from the Java class com.ibm.icu.util.IslamicCalendar from ICU4J v3.6.1 at http://www.icu-project.org/
	fromGregorian:function(/*Date*/gdate){
		// summary:
		//		This function returns the equivalent Islamic Date value for the Gregorian Date
		// example:
		//	|	var dateIslamic = new dojox.date.islamic.Date();
		//	|	var dateGregorian = new Date(2008,10,12);
		//	|	dateIslamic.fromGregorian(dateGregorian);

		var date = new Date(gdate);
		var gYear = date.getFullYear(),
			gMonth = date.getMonth(),
			gDay = date.getDate();
		
		var julianDay = (this._GREGORIAN_EPOCH - 1) + (365 * (gYear - 1)) + Math.floor((gYear - 1) / 4)
					+ (-Math.floor((gYear - 1) / 100)) + Math.floor((gYear - 1) / 400)
					+ Math.floor((((367 * (gMonth+1)) - 362) / 12)
					+ (((gMonth+1) <= 2) ? 0 : (dd.isLeapYear(date) ? -1 : -2)) + gDay);
		julianDay = Math.floor(julianDay) + 0.5;

		var days = julianDay - this._ISLAMIC_EPOCH;
		var hYear  = Math.floor( (30 * days + 10646) / 10631.0 );
		var hMonth = Math.ceil((days - 29 - this._yearStart(hYear)) / 29.5 );
		hMonth = Math.min(hMonth, 11);
		var hDay = Math.ceil(days - this._monthStart(hYear, hMonth)) + 1;

		this._date = hDay;
		this._month = hMonth;
		this._year = hYear;
		this._hours = date.getHours();
		this._minutes = date.getMinutes();
		this._seconds = date.getSeconds();
		this._milliseconds = date.getMilliseconds();
		this._day = date.getDay();
		return this;
	},
	
	valueOf:function(){
		// summary:
		//		This function returns The stored time value in milliseconds
		//		since midnight, January 1, 1970 UTC

		return this.toGregorian().valueOf();
	},

	// ported from the Java class com.ibm.icu.util.IslamicCalendar from ICU4J v3.6.1 at http://www.icu-project.org/
	_yearStart:function(/*Number*/year){
		// summary:
		//		return start of Islamic year
		return (year-1)*354 + Math.floor((3+11*year)/30.0);
	},

	// ported from the Java class com.ibm.icu.util.IslamicCalendar from ICU4J v3.6.1 at http://www.icu-project.org/
	_monthStart:function(/*Number*/year, /*Number*/month){
		// summary:
		//		return the start of Islamic Month
		return Math.ceil(29.5*month) +
			(year-1)*354 + Math.floor((3+11*year)/30.0);
	},

	// ported from the Java class com.ibm.icu.util.IslamicCalendar from ICU4J v3.6.1 at http://www.icu-project.org/
	_civilLeapYear:function(/*Number*/year){
		// summary:
		//		return Boolean value if Islamic leap year
		return (14 + 11 * year) % 30 < 11;
	},

	// ported from the Java class com.ibm.icu.util.IslamicCalendar from ICU4J v3.6.1 at http://www.icu-project.org/
	getDaysInIslamicMonth:function(/*Number*/month, /*Number*/ year){
		// summary:
		//		returns the number of days in the given Islamic Month
		var length = 0;
		length = 29 + ((month+1) % 2);
		if(month == 11 && this._civilLeapYear(year)){
			length++;
		}
		return length;
	},

	_mod:function(a, b){
		return a - (b * Math.floor(a / b));
	}
});

//TODOC
IDate.getDaysInIslamicMonth = function(/*dojox/date/islamic.Date*/month){
	return new IDate().getDaysInIslamicMonth(month.getMonth(),month.getFullYear()); // dojox.date.islamic.Date
};
return IDate;
});
