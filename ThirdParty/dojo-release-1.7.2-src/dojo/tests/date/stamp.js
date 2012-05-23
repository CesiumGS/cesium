dojo.provide("dojo.tests.date.stamp");

dojo.require("dojo.date.stamp");

tests.register("tests.date.stamp",
	[
function test_date_iso(t){
	var rfc  = "2005-06-29T08:05:00-07:00";
	var date = dojo.date.stamp.fromISOString(rfc);
	t.is(2005,date.getFullYear());
	t.is(5,date.getMonth());
	t.is(29,date.getUTCDate());
	t.is(15,date.getUTCHours());
	t.is(5,date.getUTCMinutes());
	t.is(0,date.getSeconds());

	rfc  = "2004-02-29";
	date = dojo.date.stamp.fromISOString(rfc);
	t.is(2004,date.getFullYear());
	t.is(1,date.getMonth());
	t.is(29,date.getDate());

	rfc  = "2004-01";
	date = dojo.date.stamp.fromISOString(rfc);
	t.is(2004,date.getFullYear());
	t.is(0,date.getMonth());
	t.is(1,date.getDate());

	// No TZ info means local time
	rfc  = "2004-02-29T01:23:45";
	date = dojo.date.stamp.fromISOString(rfc);
	t.is(2004,date.getFullYear());
	t.is(1,date.getMonth());
	t.is(29,date.getDate());
	t.is(1,date.getHours());

	date = new Date(2005,5,29,8,5,0);
	rfc = dojo.date.stamp.toISOString(date);
	//truncate for comparison
	t.is("2005-06",rfc.substring(0,7));

	date = new Date(101,0,2);
	date.setFullYear(101);
	rfc = dojo.date.stamp.toISOString(date);
	//truncate for comparison
	t.is("0101-01",rfc.substring(0,7));

	rfc  = "0101-01-01";
	date = dojo.date.stamp.fromISOString(rfc);
	t.is(101,date.getFullYear());
	t.is(0,date.getMonth());
	t.is(1,date.getDate());

	rfc = "0001-01T00:00:00";
	date = dojo.date.stamp.fromISOString(rfc);
	t.is(1,date.getFullYear());

	date = dojo.date.stamp.fromISOString("T18:46:39");
	t.is(18, date.getHours());
	t.is(46, date.getMinutes());
	t.is(39, date.getSeconds());
},

function test_date_iso_tz(t){

	//23:59:59.9942 or 235959.9942
//	var date = dojo.date.stamp.fromISOString("T18:46:39.9942");
//	t.is(18, date.getHours());
//	t.is(46, date.getMinutes());
//	t.is(39, date.getSeconds());
//	t.is(994, date.getMilliseconds());
	
	//1995-02-04 24:00 = 1995-02-05 00:00

	//timezone tests
	var offset = new Date().getTimezoneOffset()/60;
	date = dojo.date.stamp.fromISOString("T18:46:39+07:00");
	t.is(11, date.getUTCHours());

	date = dojo.date.stamp.fromISOString("T18:46:39+00:00");
	t.is(18, date.getUTCHours());

	date = dojo.date.stamp.fromISOString("T18:46:39Z");
	t.is(18, date.getUTCHours());

	date = dojo.date.stamp.fromISOString("T16:46:39-07:00");
	t.is(23, date.getUTCHours());
	
	date = dojo.date.stamp.fromISOString("T00:00:00Z", new Date(2010,3,1));
	t.is(0, date.getUTCHours());
	t.is(2010, date.getFullYear());
	
	//+hh:mm, +hhmm, or +hh
	
	//-hh:mm, -hhmm, or -hh
	}
	]
);
