define(["doh", "../time", "dojo/date", "dojo/date/locale", "dojox/date/hebrew/Date", "dojox/date/hebrew", "dojox/date/hebrew/locale"],
	function(doh, time, date, dateLocale, hDate, h, hLocale){
	doh.register("tests.unitTest_Time", [
		function test_decodeDate(doh){
			var d = new Date(2009, 2, 20, 5, 27, 30, 0);
			var t = d.getTime();
			var hd = new hDate(t);
			var s = "2009-03-20T05:27:30";
			
			doh.is(date.compare(d, time.newDate(d)), 0);
			doh.is(date.compare(d, time.newDate(t)), 0);
			doh.is(date.compare(d, time.newDate(s)), 0);
			doh.is(date.compare(d, time.newDate(hd)), 0);
			
			doh.is(h.compare(hd, time.newDate(hd, hDate)), 0);
			doh.is(h.compare(hd, time.newDate(d, hDate)), 0);
			doh.is(h.compare(hd, time.newDate(t, hDate)), 0);
			doh.is(h.compare(hd, time.newDate(s, hDate)), 0);
			
		}
	]);
});
