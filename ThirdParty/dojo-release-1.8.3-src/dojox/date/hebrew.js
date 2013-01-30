define(["..", "dojo/_base/lang", "dojo/date", "./hebrew/Date"], function(dojox, lang, dd, HDate){

var dhebrew = lang.getObject("date.hebrew", true, dojox);

// Utility methods to do arithmetic calculations with hebrew.Dates

// added for compat to date
dhebrew.getDaysInMonth = function(/*dojox/date/hebrew/Date*/month){
	return month.getDaysInHebrewMonth(month.getMonth(), month.getFullYear());
};

//TODO: define hebrew.isLeapYear?  Or should it be invalid, since it has different meaning?

dhebrew.compare = function(/*dojox/date/hebrew/Date*/dateheb1, /*dojox/date/hebrew/Date*/dateheb2, /*String?*/portion){
	// summary:
	//		Compare two hebrew date objects by date, time, or both.
	// description:
	//		Returns 0 if equal, positive if a > b, else negative.
	// date1: dojox/date/hebrew/Date
	// date2: dojox/date/hebrew/Date
	//		If not specified, the current hebrew.Date is used.
	// portion:
	//		A string indicating the "date" or "time" portion of a Date object.
	//		Compares both "date" and "time" by default.  One of the following:
	//		"date", "time", "datetime"

	if(dateheb1 instanceof HDate){
		dateheb1 = dateheb1.toGregorian();
	}
	if(dateheb2 instanceof HDate){
		dateheb2 = dateheb2.toGregorian();
	}
	
	return dd.compare.apply(null, arguments);
};


dhebrew.add = function(/*dojox/date/hebrew/Date*/date, /*String*/interval, /*int*/amount){
	// summary:
	//		Add to a Date in intervals of different size, from milliseconds to years
	// date: dojox/date/hebrew/Date
	//		Date object to start with
	// interval:
	//		A string representing the interval.  One of the following:
	//		"year", "month", "day", "hour", "minute", "second",
	//		"millisecond", "week", "weekday"
	// amount:
	//		How much to add to the date.

	//	based on and similar to dojo.date.add

	var newHebrDate = new HDate(date);

	switch(interval){
		case "day":
			newHebrDate.setDate(date.getDate() + amount);
			break;
		case "weekday":
			var day = date.getDay();
			var remdays = 0;
			if(amount < 0 && day == 6){ day = 5; remdays = -1; }
			
			if((day + amount) < 5 && (day + amount) >= 0){ //in the same week
				 newHebrDate.setDate(date.getDate() + amount + remdays);
			}else{
				var add = (amount > 0) ? 5 : -1;
				var adddays = (amount > 0) ? 2 : -2 ; /*first weekend */
				if  (amount > 0 && (day == 5 || day == 6)) { remdays =  4 - day; day = 4;}
				var newamount  =  day + amount - add;
				var weeks = parseInt(newamount / 5);
				var newday = newamount%5;
				newHebrDate.setDate(date.getDate() - day+ adddays + weeks * 7 + remdays + newday + add);
			}
			break;
		case "year":
			newHebrDate.setFullYear(date.getFullYear() + amount);
			break;
		case "week":
			amount *= 7;
			newHebrDate.setDate(date.getDate() + amount);
			break;
		case "month":
			var month = date.getMonth(),
				newMonth = month + amount;
			if(!date.isLeapYear(date.getFullYear())){
				if(month < 5 && newMonth >= 5){ newMonth++;}
				else if (month > 5 && newMonth <= 5){ newMonth--;}
			}
			newHebrDate.setMonth(newMonth);
			break;
		case "hour":
			newHebrDate.setHours(date.getHours() + amount);
			break;
		case "minute":
			newHebrDate._addMinutes(amount);
			break;
		case "second":
			newHebrDate._addSeconds(amount);
			break;
		case "millisecond":
			newHebrDate._addMilliseconds(amount);
			break;
	}

	return newHebrDate; // dojox.date.hebrew.Date
};

dhebrew.difference = function(/*dojox/date/hebrew/Date*/date1, /*dojox/date/hebrew/Date?*/date2, /*String?*/interval){
	// summary:
	//		date2 - date1
	// date1: dojox/date/hebrew/Date
	// date2: dojox/date/hebrew/Date
	//		If not specified, the current dojox.date.hebrew.Date is used.
	// interval:
	//		A string representing the interval.  One of the following:
	//		"year", "month", "day", "hour", "minute", "second",
	//		"millisecond",  "week", "weekday"
	//
	//		Defaults to "day".

	//	based on and similar to dojo.date.difference

	date2 = date2 || new HDate();
	interval = interval || "day";
	var yearDiff = date2.getFullYear() - date1.getFullYear();
	var delta = 1; // Integer return value
	switch(interval){
		case "weekday":
			var days = Math.round(dhebrew.difference(date1, date2, "day"));
			var weeks = parseInt(dhebrew.difference(date1, date2, "week"));
			var mod = days % 7;

			// Even number of weeks
			if(mod == 0){
				days = weeks*5;
			}else{
				// Weeks plus spare change (< 7 days)
				var adj = 0;
				var aDay = date1.getDay();
				var bDay = date2.getDay();
	
				weeks = parseInt(days/7);
				mod = days % 7;
				// Mark the date advanced by the number of
				// round weeks (may be zero)
				var dtMark = new HDate(date1);
				dtMark.setDate(dtMark.getDate()+(weeks*7));
				var dayMark = dtMark.getDay();
	
				// Spare change days -- 6 or less
				if(days > 0){
					switch(true){
						// Range starts on Fri
						case aDay == 5:
							adj = -1;
							break;
						// Range starts on Sat
						case aDay == 6:
							adj = 0;
							break;
						// Range ends on Fri
						case bDay == 5:
							adj = -1;
							break;
						// Range ends on Sat
						case bDay == 6:
							adj = -2;
							break;
						// Range contains weekend
						case (dayMark + mod) > 5:
							adj = -2;
					}
				}else if(days < 0){
					switch(true){
						// Range starts on Fri
						case aDay == 5:
							adj = 0;
							break;
						// Range starts on Sat
						case aDay == 6:
							adj = 1;
							break;
						// Range ends on Fri
						case bDay == 5:
							adj = 2;
							break;
						// Range ends on Sat
						case bDay == 6:
							adj = 1;
							break;
						// Range contains weekend
						case (dayMark + mod) < 0:
							adj = 2;
					}
				}
				days += adj;
				days -= (weeks*2);
			}
			delta = days;
			break;
		case "year":
			delta = yearDiff;
			break;
		case "month":
			var startdate =  (date2.toGregorian() > date1.toGregorian()) ? date2 : date1; // more
			var enddate = (date2.toGregorian() > date1.toGregorian()) ? date1 : date2;
			
			var month1 = startdate.getMonth();
			var month2 = enddate.getMonth();
			
			if(yearDiff == 0){
				delta = ( !date2.isLeapYear(date2.getFullYear())  && startdate.getMonth() > 5 && enddate.getMonth() <=5) ? (startdate.getMonth() - enddate.getMonth() - 1) :
						(startdate.getMonth() - enddate.getMonth() );
			}else{
				delta = (!enddate.isLeapYear(enddate.getFullYear()) &&  month2 < 6) ? (13-month2-1) : (13-month2);
				delta +=  (!startdate.isLeapYear(startdate.getFullYear()) &&  month1 > 5) ? (month1 -1): month1;
				var i = enddate.getFullYear()  + 1;
				var e = startdate.getFullYear();
				for (i;   i < e;  i++){
					delta += enddate.isLeapYear(i) ? 13 : 12;
				}
			}
			if(date2.toGregorian() < date1.toGregorian()){
				delta = -delta;
			}
			break;
		case "week":
			// Truncate instead of rounding
			// Don't use Math.floor -- value may be negative
			delta = parseInt(dhebrew.difference(date1, date2, "day")/7);
			break;
		case "day":
			delta /= 24;
			// fallthrough
		case "hour":
			delta /= 60;
			// fallthrough
		case "minute":
			delta /= 60;
			// fallthrough
		case "second":
			delta /= 1000;
			// fallthrough
		case "millisecond":
			delta *= date2.toGregorian().getTime()- date1.toGregorian().getTime();
	}

	// Round for fractional values and DST leaps
	return Math.round(delta); // Number (integer)
};
return dhebrew;
});
