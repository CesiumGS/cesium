define(["..", "doh/main", "../cldr/supplemental", "../cldr/monetary"], function(dojo, doh){
	doh.register("tests.cldr", [
		function test_date_getWeekend(t){
			t.is(6, dojo.cldr.supplemental.getWeekend('en-us').start);
			t.is(0, dojo.cldr.supplemental.getWeekend('en-us').end);
			t.is(5, dojo.cldr.supplemental.getWeekend('he-il').start);
			t.is(6, dojo.cldr.supplemental.getWeekend('he-il').end);
		}
	]);
});

