define(["doh", "../Calendar"], 
	function(doh, Calendar){
	doh.register("tests.unitTest_TimeRanges", [
	
		/* Should work but does not. Unfortunately I don't have time to investigate why...
		 {
			name: "TotoTest",
			setUp: function(){
				this.toto = 10;
			},
			tearDown: function(){
				delete this.toto;
			},
			test1: function(){
				doh.is(this.toto, 10);
			},
			test2: function(){
				doh.is(this.toto, 10);
			}
		},*/
	
		function test_DayInterval(doh){
			var o = new Calendar();
			var cal = o.dateModule;
			var startDate = new Date(2011, 0, 5);
			var res;
			
			o.set("date", startDate);
			o.set("dateInterval", "day");
			o.set("dateIntervalSteps", 1);
			o.validateRendering();
			doh.is(cal.compare(o.get("date"), startDate), 0);
			
			res = o._timeInterval;
			doh.is(cal.compare(res[0], new Date(2011, 0, 5)), 0);
			doh.is(cal.compare(res[1], new Date(2011, 0, 6)), 0);
			o.destroyRecursive();					
		},
		
		function test_MultiDayInterval(doh){
			var o = new Calendar();
			var cal = o.dateModule;
			var startDate = new Date(2011, 0, 5);
			var res;
			
			o.set("date", startDate);
			o.set("dateInterval", "day");
			o.set("dateIntervalSteps", 3);
			o.validateRendering();
			doh.is(cal.compare(o.get("date"), startDate), 0);
			
			res = o._timeInterval;
			doh.is(cal.compare(res[0], new Date(2011, 0, 5)), 0);
			doh.is(cal.compare(res[1], new Date(2011, 0, 8)), 0);
			o.destroyRecursive();					
		},
		
		function test_WeekInterval(doh){
			var o = new Calendar({
				firstDayOfWeek: 0 // do not depend on locale
			});
			var cal = o.dateModule;
			var startDate = new Date(2011, 0, 5);
			var res;
			
			o.set("date", startDate);
			o.set("dateInterval", "week");
			o.set("dateIntervalSteps", 1);
			o.validateRendering();
			doh.is(cal.compare(o.get("date"), startDate), 0);
			
			res = o._timeInterval;
			doh.is(cal.compare(res[0], new Date(2011, 0, 2)), 0);
			doh.is(cal.compare(res[1], new Date(2011, 0, 9)), 0);
			
			o.set("firstDayOfWeek", 1);
			o.validateRendering();
			doh.is(cal.compare(o.get("date"), startDate), 0);
			
			res = o._timeInterval;
			doh.is(cal.compare(res[0], new Date(2011, 0, 3)), 0);
			doh.is(cal.compare(res[1], new Date(2011, 0, 10)), 0);		
			o.destroyRecursive();		
		},
		
		function test_MultiWeekInterval(doh){
			var o = new Calendar({
				firstDayOfWeek: 0 // do not depend on locale
			});
			var cal = o.dateModule;
			var startDate = new Date(2011, 0, 5);
			var res;
			
			o.set("date", startDate);
			o.set("dateInterval", "week");
			o.set("dateIntervalSteps", 2);
			o.validateRendering();
			doh.is(cal.compare(o.get("date"), startDate), 0);
			
			res = o._timeInterval;
			doh.is(cal.compare(res[0], new Date(2011, 0, 2)), 0);
			doh.is(cal.compare(res[1], new Date(2011, 0, 16)), 0);
			
			o.set("firstDayOfWeek", 1);
			o.validateRendering();
			doh.is(cal.compare(o.get("date"), startDate), 0);
			
			res = o._timeInterval;
			doh.is(cal.compare(res[0], new Date(2011, 0, 3)), 0);
			doh.is(cal.compare(res[1], new Date(2011, 0, 17)), 0);
			o.destroyRecursive();				
		},
		
		function test_MonthInterval(doh){
			var o = new Calendar();
			var cal = o.dateModule;
			var startDate = new Date(2011, 0, 5);
			var res;
			
			o.set("date", startDate);
			o.set("dateInterval", "month");
			o.set("dateIntervalSteps", 1);
			o.validateRendering();
			doh.is(cal.compare(o.get("date"), startDate), 0);
			
			res = o._timeInterval;
			doh.is(cal.compare(res[0], new Date(2011, 0, 1)), 0);
			doh.is(cal.compare(res[1], new Date(2011, 1, 1)), 0);
			o.destroyRecursive();					
		},
		
		function test_MultiMonthInterval(doh){
			var o = new Calendar();
			var cal = o.dateModule;
			var startDate = new Date(2011, 0, 5);
			var res;
			
			o.set("date", startDate);
			o.set("dateInterval", "month");
			o.set("dateIntervalSteps", 2);
			o.validateRendering();
			doh.is(cal.compare(o.get("date"), startDate), 0);
			
			res = o._timeInterval;
			doh.is(cal.compare(res[0], new Date(2011, 0, 1)), 0);
			doh.is(cal.compare(res[1], new Date(2011, 2, 1)), 0);
			o.destroyRecursive();					
		}
		
	]);
});
