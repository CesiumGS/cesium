define(["../main", "doh", "../date", "./date/locale", "./date/stamp"], function(dojo, doh){
doh.register("tests.date.util", [

/* Informational Functions
 **************************/

function test_date_getDaysInMonth(t){
	// months other than February
	t.is(31, dojo.date.getDaysInMonth(new Date(2006,0,1)));
	t.is(31, dojo.date.getDaysInMonth(new Date(2006,2,1)));
	t.is(30, dojo.date.getDaysInMonth(new Date(2006,3,1)));
	t.is(31, dojo.date.getDaysInMonth(new Date(2006,4,1)));
	t.is(30, dojo.date.getDaysInMonth(new Date(2006,5,1)));
	t.is(31, dojo.date.getDaysInMonth(new Date(2006,6,1)));
	t.is(31, dojo.date.getDaysInMonth(new Date(2006,7,1)));
	t.is(30, dojo.date.getDaysInMonth(new Date(2006,8,1)));
	t.is(31, dojo.date.getDaysInMonth(new Date(2006,9,1)));
	t.is(30, dojo.date.getDaysInMonth(new Date(2006,10,1)));
	t.is(31, dojo.date.getDaysInMonth(new Date(2006,11,1)));

	// Februarys
	t.is(28, dojo.date.getDaysInMonth(new Date(2006,1,1)));
	t.is(29, dojo.date.getDaysInMonth(new Date(2004,1,1)));
	t.is(29, dojo.date.getDaysInMonth(new Date(2000,1,1)));
	t.is(28, dojo.date.getDaysInMonth(new Date(1900,1,1)));
	t.is(28, dojo.date.getDaysInMonth(new Date(1800,1,1)));
	t.is(28, dojo.date.getDaysInMonth(new Date(1700,1,1)));
	t.is(29, dojo.date.getDaysInMonth(new Date(1600,1,1)));
},

function test_date_isLeapYear(t){
	t.f(dojo.date.isLeapYear(new Date(2006,0,1)));
	t.t(dojo.date.isLeapYear(new Date(2004,0,1)));
	t.t(dojo.date.isLeapYear(new Date(2000,0,1)));
	t.f(dojo.date.isLeapYear(new Date(1900,0,1)));
	t.f(dojo.date.isLeapYear(new Date(1800,0,1)));
	t.f(dojo.date.isLeapYear(new Date(1700,0,1)));
	t.t(dojo.date.isLeapYear(new Date(1600,0,1)));
},

// The getTimezone function pulls from either the date's toString or
// toLocaleString method -- it's really just a string-processing
// function (assuming the Date obj passed in supporting both toString
// and toLocaleString) and as such can be tested for multiple browsers
// by manually settting up fake Date objects with the actual strings
// produced by various browser/OS combinations.
// FIXME: the function and tests are not localized.
function test_date_getTimezoneName(t){

	// Create a fake Date object with toString and toLocaleString
	// results manually set to simulate tests for multiple browsers
	function FakeDate(str, strLocale){
		this.str = str || '';
		this.strLocale = strLocale || '';
		this.toString = function(){
			return this.str;
		};
		this.toLocaleString = function(){
			return this.strLocale;
		};
	}
	var dt = new FakeDate();

	// FF 1.5 Ubuntu Linux (Breezy)
	dt.str = 'Sun Sep 17 2006 22:25:51 GMT-0500 (CDT)';
	dt.strLocale = 'Sun 17 Sep 2006 10:25:51 PM CDT';
	t.is('CDT', dojo.date.getTimezoneName(dt));

	// Safari 2.0 Mac OS X 10.4
	dt.str = 'Sun Sep 17 2006 22:55:01 GMT-0500';
	dt.strLocale = 'September 17, 2006 10:55:01 PM CDT';
	t.is('CDT', dojo.date.getTimezoneName(dt));

	// FF 1.5 Mac OS X 10.4
	dt.str = 'Sun Sep 17 2006 22:57:18 GMT-0500 (CDT)';
	dt.strLocale = 'Sun Sep 17 22:57:18 2006';
	t.is('CDT', dojo.date.getTimezoneName(dt));

	// Opera 9 Mac OS X 10.4 -- no TZ data expect empty string return
	dt.str = 'Sun, 17 Sep 2006 22:58:06 GMT-0500';
	dt.strLocale = 'Sunday September 17, 22:58:06 GMT-0500 2006';
	t.is('', dojo.date.getTimezoneName(dt));

	// IE 6 Windows XP
	dt.str = 'Mon Sep 18 11:21:07 CDT 2006';
	dt.strLocale = 'Monday, September 18, 2006 11:21:07 AM';
	t.is('CDT', dojo.date.getTimezoneName(dt));

	// Opera 9 Ubuntu Linux (Breezy) -- no TZ data expect empty string return
	dt.str = 'Mon, 18 Sep 2006 13:30:32 GMT-0500';
	dt.strLocale = 'Monday September 18, 13:30:32 GMT-0500 2006';
	t.is('', dojo.date.getTimezoneName(dt));

	// IE 5.5 Windows 2000
	dt.str = 'Mon Sep 18 13:49:22 CDT 2006';
	dt.strLocale = 'Monday, September 18, 2006 1:49:22 PM';
	t.is('CDT', dojo.date.getTimezoneName(dt));
}
	]
);

doh.register("tests.date.math",
	[
function test_date_compare(t){
	var d1=new Date();
	d1.setHours(0);
	var d2=new Date();
	d2.setFullYear(2005);
	d2.setHours(12);
	t.is(0, dojo.date.compare(d1, d1));
	t.is(1, dojo.date.compare(d1, d2, "date"));
	t.is(-1, dojo.date.compare(d2, d1, "date"));
	t.is(-1, dojo.date.compare(d1, d2, "time"));
	t.is(1, dojo.date.compare(d1, d2, "datetime"));
},
function test_date_add(t){
	var interv = ''; // Interval (e.g., year, month)
	var dtA = null; // Date to increment
	var dtB = null; // Expected result date

	interv = "year";
	dtA = new Date(2005, 11, 27);
	dtB = new Date(2006, 11, 27);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2005, 11, 27);
	dtB = new Date(2004, 11, 27);
	t.is(dtB, dojo.date.add(dtA, interv, -1));

	dtA = new Date(2000, 1, 29);
	dtB = new Date(2001, 1, 28);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2000, 1, 29);
	dtB = new Date(2005, 1, 28);
	t.is(dtB, dojo.date.add(dtA, interv, 5));

	dtA = new Date(1900, 11, 31);
	dtB = new Date(1930, 11, 31);
	t.is(dtB, dojo.date.add(dtA, interv, 30));

	dtA = new Date(1995, 11, 31);
	dtB = new Date(2030, 11, 31);
	t.is(dtB, dojo.date.add(dtA, interv, 35));

	interv = "quarter";
	dtA = new Date(2000, 0, 1);
	dtB = new Date(2000, 3, 1);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2000, 1, 29);
	dtB = new Date(2000, 7, 29);
	t.is(dtB, dojo.date.add(dtA, interv, 2));

	dtA = new Date(2000, 1, 29);
	dtB = new Date(2001, 1, 28);
	t.is(dtB, dojo.date.add(dtA, interv, 4));

	interv = "month";
	dtA = new Date(2000, 0, 1);
	dtB = new Date(2000, 1, 1);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2000, 0, 31);
	dtB = new Date(2000, 1, 29);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2000, 1, 29);
	dtB = new Date(2001, 1, 28);
	t.is(dtB, dojo.date.add(dtA, interv, 12));

	interv = "week";
	dtA = new Date(2000, 0, 1);
	dtB = new Date(2000, 0, 8);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	interv = "day";
	dtA = new Date(2000, 0, 1);
	dtB = new Date(2000, 0, 2);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2001, 0, 1);
	dtB = new Date(2002, 0, 1);
	t.is(dtB, dojo.date.add(dtA, interv, 365));

	dtA = new Date(2000, 0, 1);
	dtB = new Date(2001, 0, 1);
	t.is(dtB, dojo.date.add(dtA, interv, 366));

	dtA = new Date(2000, 1, 28);
	dtB = new Date(2000, 1, 29);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2001, 1, 28);
	dtB = new Date(2001, 2, 1);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2000, 2, 1);
	dtB = new Date(2000, 1, 29);
	t.is(dtB, dojo.date.add(dtA, interv, -1));

	dtA = new Date(2001, 2, 1);
	dtB = new Date(2001, 1, 28);
	t.is(dtB, dojo.date.add(dtA, interv, -1));

	dtA = new Date(2000, 0, 1);
	dtB = new Date(1999, 11, 31);
	t.is(dtB, dojo.date.add(dtA, interv, -1));

	interv = "weekday";
	// Sat, Jan 1
	dtA = new Date(2000, 0, 1);
	// Should be Mon, Jan 3
	dtB = new Date(2000, 0, 3);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	// Sun, Jan 2
	dtA = new Date(2000, 0, 2);
	// Should be Mon, Jan 3
	dtB = new Date(2000, 0, 3);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	// Sun, Jan 2
	dtA = new Date(2000, 0, 2);
	// Should be Fri, Jan 7
	dtB = new Date(2000, 0, 7);
	t.is(dtB, dojo.date.add(dtA, interv, 5));

	// Sun, Jan 2
	dtA = new Date(2000, 0, 2);
	// Should be Mon, Jan 10
	dtB = new Date(2000, 0, 10);
	t.is(dtB, dojo.date.add(dtA, interv, 6));

	// Mon, Jan 3
	dtA = new Date(2000, 0, 3);
	// Should be Mon, Jan 17
	dtB = new Date(2000, 0, 17);
	t.is(dtB, dojo.date.add(dtA, interv, 10));

	// Sat, Jan 8
	dtA = new Date(2000, 0, 8);
	// Should be Mon, Jan 3
	dtB = new Date(2000, 0, 3);
	t.is(dtB, dojo.date.add(dtA, interv, -5));

	// Sun, Jan 9
	dtA = new Date(2000, 0, 9);
	// Should be Wed, Jan 5
	dtB = new Date(2000, 0, 5);
	t.is(dtB, dojo.date.add(dtA, interv, -3));

	// Sun, Jan 23
	dtA = new Date(2000, 0, 23);
	// Should be Fri, Jan 7
	dtB = new Date(2000, 0, 7);
	t.is(dtB, dojo.date.add(dtA, interv, -11));

	interv = "hour";
	dtA = new Date(2000, 0, 1, 11);
	dtB = new Date(2000, 0, 1, 12);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2001, 9, 28, 0);
	dtB = new Date(dtA.getTime() + (60 * 60 * 1000));
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2001, 9, 28, 23);
	dtB = new Date(2001, 9, 29, 0);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2001, 11, 31, 23);
	dtB = new Date(2002, 0, 1, 0);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	interv = "minute";
	dtA = new Date(2000, 11, 31, 23, 59);
	dtB = new Date(2001, 0, 1, 0, 0);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2000, 11, 27, 12, 2);
	dtB = new Date(2000, 11, 27, 13, 2);
	t.is(dtB, dojo.date.add(dtA, interv, 60));

	interv = "second";
	dtA = new Date(2000, 11, 31, 23, 59, 59);
	dtB = new Date(2001, 0, 1, 0, 0, 0);
	t.is(dtB, dojo.date.add(dtA, interv, 1));

	dtA = new Date(2000, 11, 27, 8, 10, 59);
	dtB = new Date(2000, 11, 27, 8, 11, 59);
	t.is(dtB, dojo.date.add(dtA, interv, 60));

	// Test environment JS Date doesn't support millisec?
	//interv = "millisecond";
	//
	//dtA = new Date(2000, 11, 31, 23, 59, 59, 999);
	//dtB = new Date(2001, 0, 1, 0, 0, 0, 0);
	//t.is(dtB, dojo.date.add(dtA, interv, 1));
	//
	//dtA = new Date(2000, 11, 27, 8, 10, 53, 2);
	//dtB = new Date(2000, 11, 27, 8, 10, 54, 2);
	//t.is(dtB, dojo.date.add(dtA, interv, 1000));
},
function test_date_diff(t){
	var dtA = null; // First date to compare
	var dtB = null; // Second date to compare
	var interv = ''; // Interval to compare on (e.g., year, month)

	interv = "year";
	dtA = new Date(2005, 11, 27);
	dtB = new Date(2006, 11, 27);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2000, 11, 31);
	dtB = new Date(2001, 0, 1);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	interv = "quarter";
	dtA = new Date(2000, 1, 29);
	dtB = new Date(2001, 2, 1);
	t.is(4, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2000, 11, 1);
	dtB = new Date(2001, 0, 1);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	interv = "month";
	dtA = new Date(2000, 1, 29);
	dtB = new Date(2001, 2, 1);
	t.is(13, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2000, 11, 1);
	dtB = new Date(2001, 0, 1);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	interv = "week";
	dtA = new Date(2000, 1, 1);
	dtB = new Date(2000, 1, 8);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2000, 1, 28);
	dtB = new Date(2000, 2, 6);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2000, 2, 6);
	dtB = new Date(2000, 1, 28);
	t.is(-1, dojo.date.difference(dtA, dtB, interv));

	interv = "day";
	dtA = new Date(2000, 1, 29);
	dtB = new Date(2000, 2, 1);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2000, 11, 31);
	dtB = new Date(2001, 0, 1);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	// DST leap -- check for rounding err
	// This is dependent on US calendar, but
	// shouldn't break in other locales
	dtA = new Date(2005, 3, 3);
	dtB = new Date(2005, 3, 4);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	interv = "weekday";
	dtA = new Date(2006, 7, 3);
	dtB = new Date(2006, 7, 11);
	t.is(6, dojo.date.difference(dtA, dtB, interv));

	// Positive diffs
	dtA = new Date(2006, 7, 4);
	dtB = new Date(2006, 7, 11);
	t.is(5, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 5);
	dtB = new Date(2006, 7, 11);
	t.is(5, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 6);
	dtB = new Date(2006, 7, 11);
	t.is(5, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 7);
	dtB = new Date(2006, 7, 11);
	t.is(4, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 7);
	dtB = new Date(2006, 7, 13);
	t.is(4, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 7);
	dtB = new Date(2006, 7, 14);
	t.is(5, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 7);
	dtB = new Date(2006, 7, 15);
	t.is(6, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 7);
	dtB = new Date(2006, 7, 28);
	t.is(15, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 2, 2);
	dtB = new Date(2006, 2, 28);
	t.is(18, dojo.date.difference(dtA, dtB, interv));

	// Negative diffs
	dtA = new Date(2006, 7, 11);
	dtB = new Date(2006, 7, 4);
	t.is(-5, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 11);
	dtB = new Date(2006, 7, 5);
	t.is(-4, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 11);
	dtB = new Date(2006, 7, 6);
	t.is(-4, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 11);
	dtB = new Date(2006, 7, 7);
	t.is(-4, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 13);
	dtB = new Date(2006, 7, 7);
	t.is(-5, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 14);
	dtB = new Date(2006, 7, 7);
	t.is(-5, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 15);
	dtB = new Date(2006, 7, 7);
	t.is(-6, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 7, 28);
	dtB = new Date(2006, 7, 7);
	t.is(-15, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2006, 2, 28);
	dtB = new Date(2006, 2, 2);
	t.is(-18, dojo.date.difference(dtA, dtB, interv));

	// Two days on the same weekend -- no weekday diff
	dtA = new Date(2006, 7, 5);
	dtB = new Date(2006, 7, 6);
	t.is(0, dojo.date.difference(dtA, dtB, interv));

	interv = "hour";
	dtA = new Date(2000, 11, 31, 23);
	dtB = new Date(2001, 0, 1, 0);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2000, 11, 31, 12);
	dtB = new Date(2001, 0, 1, 0);
	t.is(12, dojo.date.difference(dtA, dtB, interv));

	interv = "minute";
	dtA = new Date(2000, 11, 31, 23, 59);
	dtB = new Date(2001, 0, 1, 0, 0);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2000, 1, 28, 23, 59);
	dtB = new Date(2000, 1, 29, 0, 0);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	interv = "second";
	dtA = new Date(2000, 11, 31, 23, 59, 59);
	dtB = new Date(2001, 0, 1, 0, 0, 0);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	interv = "millisecond";
	dtA = new Date(2000, 11, 31, 23, 59, 59, 999);
	dtB = new Date(2001, 0, 1, 0, 0, 0, 0);
	t.is(1, dojo.date.difference(dtA, dtB, interv));

	dtA = new Date(2000, 11, 31, 23, 59, 59, 0);
	dtB = new Date(2001, 0, 1, 0, 0, 0, 0);
	t.is(1000, dojo.date.difference(dtA, dtB, interv));
},
function test_date_add_diff_year(t){
	var interv = ''; // Interval (e.g., year, month)
	var dtA = null; // Date to increment
	var dtB = null; // Expected result date

	interv = "year";
	dtA = new Date(2005, 11, 27);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2005, 11, 27);
	dtB = dojo.date.add(dtA, interv, -1);
	t.is(dojo.date.difference(dtA, dtB, interv), -1);

	dtA = new Date(2000, 1, 29);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2000, 1, 29);
	dtB = dojo.date.add(dtA, interv, 5);
	t.is(dojo.date.difference(dtA, dtB, interv), 5);

	dtA = new Date(1900, 11, 31);
	dtB = dojo.date.add(dtA, interv, 30);
	t.is(dojo.date.difference(dtA, dtB, interv), 30);

	dtA = new Date(1995, 11, 31);
	dtB = dojo.date.add(dtA, interv, 35);
	t.is(dojo.date.difference(dtA, dtB, interv), 35);
},
function test_date_add_diff_quarter(t){
	var interv = ''; // Interval (e.g., year, month)
	var dtA = null; // Date to increment
	var dtB = null; // Expected result date
	interv = "quarter";
	dtA = new Date(2000, 0, 1);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2000, 1, 29);
	dtB = dojo.date.add(dtA, interv, 2);
	t.is(dojo.date.difference(dtA, dtB, interv), 2);

	dtA = new Date(2000, 1, 29);
	dtB = dojo.date.add(dtA, interv, 4);
	t.is(dojo.date.difference(dtA, dtB, interv), 4);
},
function test_date_add_diff_month(t){
	var interv = ''; // Interval (e.g., year, month)
	var dtA = null; // Date to increment
	var dtB = null; // Expected result date
	interv = "month";
	dtA = new Date(2000, 0, 1);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2000, 0, 31);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2000, 1, 29);
	dtB = dojo.date.add(dtA, interv, 12);
	t.is(dojo.date.difference(dtA, dtB, interv), 12);
},
function test_date_add_diff_week(t){
	var interv = ''; // Interval (e.g., year, month)
	var dtA = null; // Date to increment
	var dtB = null; // Expected result date
	interv = "week";
	dtA = new Date(2000, 0, 1);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);
},
function test_date_add_diff_day(t){
	var interv = ''; // Interval (e.g., year, month)
	var dtA = null; // Date to increment
	var dtB = null; // Expected result date
	interv = "day";
	dtA = new Date(2000, 0, 1);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2001, 0, 1);
	dtB = dojo.date.add(dtA, interv, 365);
	t.is(dojo.date.difference(dtA, dtB, interv), 365);

	dtA = new Date(2000, 0, 1);
	dtB = dojo.date.add(dtA, interv, 366);
	t.is(dojo.date.difference(dtA, dtB, interv), 366);

	dtA = new Date(2000, 1, 28);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2001, 1, 28);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2000, 2, 1);
	dtB = dojo.date.add(dtA, interv, -1);
	t.is(dojo.date.difference(dtA, dtB, interv), -1);

	dtA = new Date(2001, 2, 1);
	dtB = dojo.date.add(dtA, interv, -1);
	t.is(dojo.date.difference(dtA, dtB, interv), -1);

	dtA = new Date(2000, 0, 1);
	dtB = dojo.date.add(dtA, interv, -1);
	t.is(dojo.date.difference(dtA, dtB, interv), -1);
},
function test_date_add_diff_weekday(t){
	var interv = ''; // Interval (e.g., year, month)
	var dtA = null; // Date to increment
	var dtB = null; // Expected result date
	interv = "weekday";
	// Sat, Jan 1
	dtA = new Date(2000, 0, 1);
	// Should be Mon, Jan 3
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	// Sun, Jan 2
	dtA = new Date(2000, 0, 2);
	// Should be Mon, Jan 3
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	// Sun, Jan 2
	dtA = new Date(2000, 0, 2);
	// Should be Fri, Jan 7
	dtB = dojo.date.add(dtA, interv, 5);
	t.is(dojo.date.difference(dtA, dtB, interv), 5);

	// Sun, Jan 2
	dtA = new Date(2000, 0, 2);
	// Should be Mon, Jan 10
	dtB = dojo.date.add(dtA, interv, 6);
	t.is(dojo.date.difference(dtA, dtB, interv), 6);

	// Mon, Jan 3
	dtA = new Date(2000, 0, 3);
	// Should be Mon, Jan 17
	dtB = dojo.date.add(dtA, interv, 10);
	t.is(dojo.date.difference(dtA, dtB, interv), 10);

	// Sat, Jan 8
	dtA = new Date(2000, 0, 8);
	// Should be Mon, Jan 3
	dtB = dojo.date.add(dtA, interv, -5);
	t.is(dojo.date.difference(dtA, dtB, interv), -5);

	// Sun, Jan 9
	dtA = new Date(2000, 0, 9);
	// Should be Wed, Jan 5
	dtB = dojo.date.add(dtA, interv, -3);
	t.is(dojo.date.difference(dtA, dtB, interv), -3);

	// Sun, Jan 23
	dtA = new Date(2000, 0, 23);
	// Should be Fri, Jan 7
	dtB = dojo.date.add(dtA, interv, -11);
	t.is(dojo.date.difference(dtA, dtB, interv), -11);
},
function test_date_add_diff_hour(t){
	var interv = ''; // Interval (e.g., year, month)
	var dtA = null; // Date to increment
	var dtB = null; // Expected result date
	interv = "hour";
	dtA = new Date(2000, 0, 1, 11);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2001, 9, 28, 0);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2001, 9, 28, 23);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2001, 11, 31, 23);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);
},
function test_date_add_diff_minute(t){
	var interv = ''; // Interval (e.g., year, month)
	var dtA = null; // Date to increment
	var dtB = null; // Expected result date
	interv = "minute";
	dtA = new Date(2000, 11, 31, 23, 59);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2000, 11, 27, 12, 2);
	dtB = dojo.date.add(dtA, interv, 60);
	t.is(dojo.date.difference(dtA, dtB, interv), 60);
},
function test_date_add_diff_second(t){
	var interv = ''; // Interval (e.g., year, month)
	var dtA = null; // Date to increment
	var dtB = null; // Expected result date
	console.debug("second");
	interv = "second";
	dtA = new Date(2000, 11, 31, 23, 59, 59);
	dtB = dojo.date.add(dtA, interv, 1);
	t.is(dojo.date.difference(dtA, dtB, interv), 1);

	dtA = new Date(2000, 11, 27, 8, 10, 59);
	dtB = dojo.date.add(dtA, interv, 60);
	t.is(dojo.date.difference(dtA, dtB, interv), 60);

	// Test environment JS Date doesn't support millisec?
	//interv = "millisecond";
	//
	//dtA = new Date(2000, 11, 31, 23, 59, 59, 999);
	//dtB = dojo.date.add(dtA, interv, 1);
	//t.is(dojo.date.difference(dtA, dtB, interv), 1);
	//
	//dtA = new Date(2000, 11, 27, 8, 10, 53, 2);
	//dtB = dojo.date.add(dtA, interv, 1000);
	//t.is(dojo.date.difference(dtA, dtB, interv), 1000);
}
	]
);
});
