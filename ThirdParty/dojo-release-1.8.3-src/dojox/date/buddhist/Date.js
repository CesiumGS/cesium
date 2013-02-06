define([
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/date"
], function(lang, declare, dd){

var BDate = declare("dojox.date.buddhist.Date", null, {

	_date: 0,
	_month: 0,
	_year: 0,
	_hours: 0,
	_minutes: 0,
	_seconds: 0,
	_milliseconds: 0,
	_day: 0,

 	constructor: function(){
		// summary:
		//		This is the constructor
		// description:
		//		This function initialize the date object values
		// example:
		//	|	var date1 = new dojox.date.buddhist.Date();
		//	|	var date2 = new dojox.date.buddhist.Date(date1);
		//	|	var date3 = new dojox.date.buddhist.Date(2552,2,12);

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
				this._date = new Date("");
			}else{
				this._year = arg0._year;
				this._month =  arg0._month;
				this._date = arg0._date;
				this._hours = arg0._hours;
				this._minutes = arg0._minutes;
				this._seconds = arg0._seconds;
				this._milliseconds = arg0._milliseconds;
			}
		}else if(len >=3){
			this._year += arguments[0];
			this._month += arguments[1];
			this._date += arguments[2];
			
			if(this._month >11){
				console.warn("the month is incorrect , set 0");
				this._month = 0;
			}
			this._hours += arguments[3] || 0;
			this._minutes += arguments[4] || 0;
			this._seconds += arguments[5] || 0;
			this._milliseconds += arguments[6] || 0;
		}
	},
	
	getDate: function(/*boolean?*/isNumber){
		// summary:
		//		This function returns the date value (0 - 30)
		// example:
		//	|	var date1 = new dojox.date.buddhist.Date();
		//	|	console.log(date1.getDate());
		return parseInt(this._date);
	},

	getMonth: function(){
		// summary:
		//		This function return the month value ( 0 - 11 )
		// example:
		//	|	var date1 = new dojox.date.buddhist.Date();
		//	|	console.log(date1.getMonth()+1);
		return parseInt(this._month);
	},


	getFullYear: function(){
		// summary:
		//		This function return the Year value
		// example:
		//	|	var date1 = new dojox.date.buddhist.Date();
		//	|	console.log(date1.getFullYear());
		return parseInt(this._year);
	},
			
	getHours: function(){
		// summary:
		//		returns the Hour value
		return this._hours;
	},
		
	getMinutes: function(){
		// summary:
		//		returns the Minutes value
		return this._minutes;
	},

	getSeconds: function(){
		// summary:
		//		returns the Seconds value
		return this._seconds;
	},

	getMilliseconds: function(){
		// summary:
		//		returns the Milliseconds value
		return this._milliseconds;
	},

	setDate: function(/*number*/date){
		// summary:
		//		This function sets the Date
		// example:
		//	|	var date1 = new dojox.date.buddhist.Date();
		//	|	date1.setDate(2);
		date = parseInt(date);

		if(date > 0 && date <= this._getDaysInMonth(this._month, this._year)){
			this._date = date;
		}else{
			var mdays;
			if(date>0){
				for(mdays = this._getDaysInMonth(this._month, this._year);
					date > mdays;
						date -= mdays,mdays = this._getDaysInMonth(this._month, this._year)){
					this._month++;
					if(this._month >= 12){this._year++; this._month -= 12;}
				}

				this._date = date;
			}else{
				for(mdays = this._getDaysInMonth((this._month-1)>=0 ?(this._month-1) :11 ,((this._month-1)>=0)? this._year: this._year-1);
						date <= 0;
							mdays = this._getDaysInMonth((this._month-1)>=0 ? (this._month-1) :11,((this._month-1)>=0)? this._year: this._year-1)){
					this._month--;
					if(this._month < 0){this._year--; this._month += 12;}

					date+=mdays;
				}
				this._date = date;
			}
		}
		return this;
	},
	
	setFullYear: function(/*number*/year, /*number?*/month, /*number?*/ date){
		// summary:
		//		This function set Year
		// example:
		//	|	var date1 = new dojox.date.buddhist.Date();
		//	|	date1.setFullYear(2552);
		//	|	date1.setFullYear(2552, 1, 1);
		this._year = parseInt(year);
	},
			
	setMonth: function(/*number*/month){
		// summary:
		//		This function set Month
		// example:
		//	|	var date1 = new dojox.date.buddhist.Date();
		//	|	date1.setMonth(0); //first month
		this._year += Math.floor(month / 12);
		this._month = Math.floor(month % 12);
		for(; this._month < 0; this._month = this._month+12);
	},
			
	setHours: function(){
		// summary:
		//		set the Hours  0-23
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
			var mdays = this._getDaysInMonth(this._month, this._year);
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

	toString: function(){
		// summary:
		//		This returns a string representation of the date in "dd, MM, YYYY HH:MM:SS" format
		return isNaN(this._date)?"Invalid Date":
			this._date + ", " + this._month + ", " + this._year + "  " + this._hours + ":" + this._minutes + ":" + this._seconds; // String
	},

//FIXME: remove this and replace usage with dojox.date.buddhist.getDaysInMonth?
	_getDaysInMonth: function(/*number*/month, /*number*/ year){
		return dd.getDaysInMonth(new Date(year-543, month));
	},

	fromGregorian: function(/*Date*/gdate){
		// summary:
		//		This function sets this Date to the Hebrew Date corresponding to the Gregorian Date
		var date = new Date(gdate);
		this._date = date.getDate();
		this._month = date.getMonth();
		this._year = date.getFullYear()+543;
		this._hours = date.getHours();
		this._minutes = date.getMinutes();
		this._seconds = date.getSeconds();
		this._milliseconds = date.getMilliseconds();
		this._day = date.getDay();
		return this;
	},

	toGregorian: function(){
		// summary:
		//		This returns the equivalent Gregorian date value as a Date object
		return new Date(this._year-543, this._month, this._date, this._hours, this._minutes, this._seconds, this._milliseconds); // Date
	},
	
	getDay: function(){
		// summary:
		//		This function return Week Day value ( 0 - 6 )
		return this.toGregorian().getDay(); // int
	}
});

BDate.prototype.valueOf = function(){
	return this.toGregorian().valueOf();
};

return BDate;
});
