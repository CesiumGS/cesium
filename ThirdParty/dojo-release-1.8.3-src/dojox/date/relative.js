define(["..", "dojo/_base/lang", "dojo/date/locale", "dojo/i18n"], function(dojox, lang, ddl, i18n){

var drelative = lang.getObject("date.relative", true, dojox);

/*=====
var __FormatOptions = {
	// locale: String
	//		override the locale used to determine formatting rules
	// relativeDate: Date
	//		Date to calculate relation to (defaults to new Date())
	// weekCheck: boolean
	//		Whether or not to display the day of week (defaults true)
};
=====*/

var DAY = 1000*60*60*24,
	SIX_DAYS = 6 * DAY,
	del = dojo.delegate,
	ggb = ddl._getGregorianBundle,
	fmt = ddl.format;

function _clearTime(date){
	date = new Date(date);
	date.setHours(0, 0, 0, 0);
	return date;
}

drelative.format = function(/*Date*/dateObject, /*__FormatOptions?*/options){
	// summary:
	//		Format a Date object as a String, using locale-specific settings,
	//		relative to the current date or some other date.
	//
	// description:
	//		Create a string from a Date object using the most significant information
	//		and a known localized pattern.  This method formats both the date and
	//		time from dateObject.  Formatting patterns are chosen appropriate to
	//		the locale.
	//
	//		If the day portion of the date falls within the current date (or the
	//		relativeDate option, if present), then the time will be all that
	//		is displayed
	//
	//		If the day portion of the date falls within the past week (or the
	//		week preceeding relativeDate, if present), then the display will show
	//		day of week and time.  This functionality can be turned off by setting
	//		weekCheck to false.
	//
	//		If the year portion of the date falls within the current year (or the
	//		year portion of relativeDate, if present), then the display will show
	//		month and day.
	//
	//		Otherwise, this function is equivalent to calling dojo.date.format with
	//		formatLength of "medium"
	//
	// dateObject:
	//		the date and time to be formatted.
	
	options = options || {};
	
	var today = _clearTime(options.relativeDate || new Date()),
		diff = today.getTime() - _clearTime(dateObject).getTime(),
		fmtOpts = {locale: options.locale};
	
	if(diff === 0){
		// today: 9:32 AM
		return fmt(dateObject, del(fmtOpts, {selector: "time"}));
	}else if(diff <= SIX_DAYS && diff > 0 && options.weekCheck !== false){
		// within the last week: Mon 9:32 am
		return fmt(dateObject, del(fmtOpts, {selector: "date", datePattern: "EEE"})) +
				" " +
				fmt(dateObject, del(fmtOpts, {selector: "time", formatLength: "short"}));
	}else if(dateObject.getFullYear() == today.getFullYear()){
		// this year: Nov 1
		var bundle = ggb(i18n.normalizeLocale(options.locale));
		return fmt(dateObject, del(fmtOpts, {
			selector: "date",
			datePattern: bundle["dateFormatItem-MMMd"]
		}));
	}else{
		// default: Jun 1, 2010
		return fmt(dateObject, del(fmtOpts, {
			selector: "date",
			formatLength: "medium",
			locale: options.locale
		}));
	}
};

	return drelative;
});
