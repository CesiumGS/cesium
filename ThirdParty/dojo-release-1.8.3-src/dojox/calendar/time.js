define(["dojo/_base/lang", "dojo/date", "dojo/cldr/supplemental", "dojo/date/stamp"], function(lang, date, cldr, stamp) {

// summary: Advanced date manipulation utilities.

var time = {};


time.newDate = function(obj, dateClassObj){
	// summary:
	//		Creates a new Date object.
	// obj: Object
	//		This object can have several values:
	//		- the time in milliseconds since gregorian epoch.
	//		- a Date instance
	//		- a String instance that can be decoded by the dojo/date/stamp class.
	// dateClassObj: Object?
	//		The Date class used, by default the native Date.

	// returns: Date
	dateClassObj = dateClassObj || Date;  
	var d;
	
	if(typeof(obj) == "number"){
		return new dateClassObj(time);
	}else if(obj.getTime){
		return new dateClassObj(obj.getTime());
	}else if(obj.toGregorian){
		d = obj.toGregorian();
		if(dateClassObj !== Date){
			d = new dateClassObj(d.getTime());
		}
		return d;
	}else if(typeof obj == "string"){
		d = stamp.fromISOString(obj);
		if(d === null){
			d = new dateClassObj(obj); // kept for backward compat, will throw error in dojo 1.9
		}else if(dateClassObj !== Date){ // from Date to dateClassObj
			d = new dateClassObj(d.getTime());
		}
		return d;
	}
	
};

time.floorToDay = function(d, reuse, dateClassObj){
	// summary:
	//		Floors the specified date to the start of day.
	// date: Date
	//		The date to floor.
	// reuse: Boolean
	//		Whether use the specified instance or create a new one. Default is false.
	// dateClassObj: Object?
	//		The Date class used, by default the native Date.	
	// returns: Date
	dateClassObj = dateClassObj || Date;  
	
	if(!reuse){
		d = time.newDate(d, dateClassObj);
	}
	
	d.setHours(0, 0, 0, 0);
		
	return d;
};

time.floorToMonth = function(d, reuse, dateClassObj){
	// summary:
	//		Floors the specified date to the start of the date's month.
	// date: Date
	//		The date to floor.
	// reuse: Boolean
	//		Whether use the specified instance or create a new one. Default is false.
	// dateClassObj: Object?
	//		The Date class used, by default the native Date.	
	// returns: Date
	dateClassObj = dateClassObj || Date;  
	
	if(!reuse){
		d = time.newDate(d, dateClassObj);
	}
	
	d.setDate(1);
	d.setHours(0, 0, 0, 0);
	
	return d;
};


time.floorToWeek = function(d, dateClassObj, dateModule, firstDayOfWeek, locale){
	// summary:
	//		Floors the specified date to the beginning of week.
	// d: Date
	//		Date to floor.
	// dateClassObj: Object?
	//		The Date class used, by default the native Date.	
	// dateModule: Object?
	//		Object that contains the "add" method. By default dojo.date is used.
	// firstDayOfWeek: Integer?
	//		Optional day of week that overrides the one provided by the CLDR.	
	// locale: String?
	//		Optional locale used to determine first day of week.
	dateClassObj = dateClassObj || Date; 
	dateModule = dateModule || date;  	
	
	var fd = firstDayOfWeek == undefined || firstDayOfWeek < 0 ? cldr.getFirstDayOfWeek(locale) : firstDayOfWeek;
	var day = d.getDay();
	if(day == fd){
		return d;
	}
	return time.floorToDay(
		dateModule.add(d, "day", day > fd ? -day+fd : fd-day),
		true, dateClassObj);
};

time.floor = function(date, unit, steps, reuse, dateClassObj){
	// summary:
	//		floors the date to the unit.
	// date: Date
	//		The date/time to floor.
	// unit: String
	//		The unit. Valid values are "minute", "hour", "day".
	// steps: Integer
	//		Valid for "minute" or "hour" units.
	// reuse: Boolean
	//		Whether use the specified instance or create a new one. Default is false.	
	// dateClassObj: Object?
	//		The Date class used, by default the native Date.
	// returns: Date

	var d = time.floorToDay(date, reuse, dateClassObj);
	
	switch(unit){
		case "week":
			return time.floorToWeek(d, firstDayOfWeek, dateModule, locale);
		case "minute":
			d.setHours(date.getHours());
			d.setMinutes(Math.floor(date.getMinutes() /steps) * steps);
			break;
		case "hour":
			d.setHours(Math.floor(date.getHours() /steps) * steps);
			break;
	}
	return d;
};

time.isStartOfDay = function(d, dateClassObj, dateModule){
	// summary:
	//		Tests if the specified date represents the starts of day. 
	// d: Date
	//		The date to test.
	// dateClassObj: Object?
	//		The Date class used, by default the native Date.	
	// dateModule: Object?
	//		Object that contains the "add" method. By default dojo.date is used.
	// returns: Boolean
	dateModule = dateModule || date;
	return dateModule.compare(this.floorToDay(d, false, dateClassObj), d) == 0;
};

time.isToday = function(d, dateClassObj){
	// summary:
	//		Returns whether the specified date is in the current day.
	// d: Date
	//		The date to test.
	// dateClassObj: Object?
	//		The Date class used, by default the native Date.
	// returns: Boolean
	dateClassObj = dateClassObj || Date;
	var today = new dateClassObj();
	return d.getFullYear() == today.getFullYear() &&
				 d.getMonth() == today.getMonth() && 
				 d.getDate() == today.getDate();
};

return time;
});