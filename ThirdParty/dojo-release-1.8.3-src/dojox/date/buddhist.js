define(["..", "dojo/_base/lang", "dojo/date", "./buddhist/Date"], function(dojox, lang, dd, BDate){
	var dbuddhist = lang.getObject("date.buddhist", true, dojox);

// Utility methods to do arithmetic calculations with buddhist.Dates

dbuddhist.getDaysInMonth = function(/*dojox/date/buddhist/Date*/dateObject){
	return dd.getDaysInMonth(dateObject.toGregorian());
};

dbuddhist.isLeapYear = function(/*dojox/date/buddhist/Date*/dateObject){
	return dd.isLeapYear(dateObject.toGregorian());
};

//FIXME: reduce compare, add, diff also
dbuddhist.compare = function(/*dojox/date/buddhist/Date*/date1, /*dojox/date/buddhist/Date*/date2, /*String?*/portion){
	// summary:
	//		Compare two buddhist date objects by date, time, or both.
	return dd.compare(date1,date2, portion); // int
};


dbuddhist.add = function(/*dojox/date/buddhist/Date*/date, /*String*/interval, /*int*/amount){
	// summary:
	//		Add to a Date in intervals of different size, from milliseconds to years
	// date: dojox/date/buddhist/Date
	//		Date object to start with
	// interval:
	//		A string representing the interval.  One of the following:
	//		"year", "month", "day", "hour", "minute", "second",
	//		"millisecond", "week", "weekday"
	// amount:
	//		How much to add to the date.

	//	based on and similar to dojo.date.add

	var newBuddDate = new BDate(date);

	switch(interval){
		case "day":
			newBuddDate.setDate(date.getDate(true) + amount);
			break;
		case "weekday":
			var days, weeks;
			var mod = amount % 5;
			if(!mod){
				days = (amount > 0) ? 5 : -5;
				weeks = (amount > 0) ? ((amount-5)/5) : ((amount+5)/5);
			}else{
				days = mod;
				weeks = parseInt(amount/5);
			}
			// Get weekday value for orig date param
			var strt = date.getDay();
			// Orig date is Sat / positive incrementer
			// Jump over Sun
			var adj = 0;
			if(strt == 6 && amount > 0){
				adj = 1;
			}else if(strt == 0 && amount < 0){
			// Orig date is Sun / negative incrementer
			// Jump back over Sat
				adj = -1;
			}
			// Get weekday val for the new date
			var trgt = strt + days;
			// New date is on Sat or Sun
			if(trgt == 0 || trgt == 6){
				adj = (amount > 0) ? 2 : -2;
			}
			// Increment by number of weeks plus leftover days plus
			// weekend adjustments
			amount = (7 * weeks) + days + adj;
			newBuddDate.setDate(date.getDate(true) + amount);
			break;
		case "year":
			newBuddDate.setFullYear(date.getFullYear() + amount );
			break;
		case "week":
			amount *= 7;
			newBuddDate.setDate(date.getDate(true) + amount);
			break;
		case "month":
			newBuddDate.setMonth(date.getMonth() + amount);
			break;
		case "hour":
			newBuddDate.setHours(date.getHours() + amount );
			break;
		case "minute":
			newBuddDate._addMinutes(amount);
			break;
		case "second":
			newBuddDate._addSeconds(amount);
			break;
		case "millisecond":
			newBuddDate._addMilliseconds(amount);
			break;
	}
	return newBuddDate; // dojox.date.buddhist.Date
};

dbuddhist.difference = function(/*dojox/date/buddhist/Date*/date1, /*dojox/date/buddhist/Date?*/date2, /*String?*/interval){
	// summary:
	//		date2 - date1
	// date1: dojox/date/dbuddhist/Date
	// date2: dojox/date/dbuddhist/Date
	//		If not specified, the current dojox.date.dbuddhist.Date is used.
	// interval:
	//		A string representing the interval.  One of the following:
	//		"year", "month", "day", "hour", "minute", "second",
	//		"millisecond",  "week", "weekday"
	//
	//		Defaults to "day".

	//	based on and similar to dojo.date.difference

	date2 = date2 || new BDate();
	interval = interval || "day";
	var yearDiff = date2.getFullYear() - date1.getFullYear();
	var delta = 1; // Integer return value
	switch(interval){
		case "weekday":
			var days = Math.round(dbuddhist.difference(date1, date2, "day"));
			var weeks = parseInt(dbuddhist.difference(date1, date2, "week"));
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
				var dtMark = new BDate(date2);
				dtMark.setDate(dtMark.getDate(true)+(weeks*7));
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
			
			if (yearDiff == 0){
				delta = startdate.getMonth() - enddate.getMonth() ;
			}else{
				delta = 12-month2;
				delta +=  month1;
				var i = enddate.getFullYear()+1;
				var e = startdate.getFullYear();
				for (i;   i < e;  i++){
					delta += 12;
				}
			}
			if (date2.toGregorian() < date1.toGregorian()){
				delta = -delta;
			}
			break;
		case "week":
			// Truncate instead of rounding
			// Don't use Math.floor -- value may be negative
			delta = parseInt(dbuddhist.difference(date1, date2, "day")/7);
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
return dbuddhist;
});