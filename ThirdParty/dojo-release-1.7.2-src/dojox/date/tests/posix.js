dojo.provide("dojox.date.tests.posix");
dojo.require("dojox.date.posix");

tests.register("dojox.date.tests.posix",
	[
		{
			// see tests for dojo.date.locale for setup info

			name: "dojox.date.tests.posix",
			setUp: function(){
				var partLocaleList = ["en"];

				dojo.forEach(partLocaleList, function(locale){
					dojo.requireLocalization("dojo.cldr", "gregorian", locale);
				});
			},
			runTest: function(t){
			},
			tearDown: function(){
				//Clean up bundles that should not exist if
				//the test is re-run.
//				delete dojo.cldr.nls.gregorian;
			}
		},
		{
			name: "strftime",
			runTest: function(t){
				var date = new Date(2006, 7, 11, 0, 55, 12, 3456);
				t.is("06/08/11", dojox.date.posix.strftime(date, "%y/%m/%d"));
			
				var dt = null; // Date to test
				var fmt = ''; // Format to test
				var res = ''; // Expected result
				
				dt = new Date(2006, 0, 1, 18, 23);
				fmt = '%a';
				res = 'Sun';
				t.is(res, dojox.date.posix.strftime(dt, fmt, 'en'));
				
				fmt = '%A';
				res = 'Sunday';
				t.is(res, dojox.date.posix.strftime(dt, fmt, 'en'));
				
				fmt = '%b';
				res = 'Jan';
				t.is(res, dojox.date.posix.strftime(dt, fmt, 'en'));
				
				fmt = '%B';
				res = 'January';
				t.is(res, dojox.date.posix.strftime(dt, fmt, 'en'));
			
				fmt = '%c';
				res = 'Sunday, January 1, 2006 6:23:00 PM';
				t.is(res, dojox.date.posix.strftime(dt, fmt).substring(0, res.length));
				
				fmt = '%C';
				res = '20';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%d';
				res = '01';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%D';
				res = '01/01/06';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%e';
				res = ' 1';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%h';
				res = 'Jan';
				t.is(res, dojox.date.posix.strftime(dt, fmt, 'en'));
				
				fmt = '%H';
				res = '18';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%I';
				res = '06';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%j';
				res = '001';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%k';
				res = '18';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%l';
				res = ' 6';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%m';
				res = '01';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%M';
				res = '23';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%p';
				res = 'PM';
				t.is(res, dojox.date.posix.strftime(dt, fmt, 'en'));
				
				fmt = '%r';
				res = '06:23:00 PM';
				t.is(res, dojox.date.posix.strftime(dt, fmt, 'en'));
				
				fmt = '%R';
				res = '18:23';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%S';
				res = '00';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%T';
				res = '18:23:00';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%u';
				res = '7';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%w';
				res = '0';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
			
				fmt = '%x';
				res = 'Sunday, January 1, 2006';
				t.is(res, dojox.date.posix.strftime(dt, fmt, 'en'));
			
				fmt = '%X';
				res = '6:23:00 PM';
				t.is(res, dojox.date.posix.strftime(dt, fmt, 'en').substring(0,res.length));
				
				fmt = '%y';
				res = '06';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%Y';
				res = '2006';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
				
				fmt = '%%';
				res = '%';
				t.is(res, dojox.date.posix.strftime(dt, fmt));
			}
		},
		{
			name: "getStartOfWeek",
			runTest: function(t){
				var weekStart;
				
				// Monday
				var date = new Date(2007, 0, 1);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 1), 1);
				t.is(date, weekStart);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 2), 1);
				t.is(date, weekStart);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 3), 1);
				t.is(date, weekStart);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 4), 1);
				t.is(date, weekStart);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 5), 1);
				t.is(date, weekStart);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 6), 1);
				t.is(date, weekStart);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 7), 1);
				t.is(date, weekStart);
			
				// Sunday
				date = new Date(2007, 0, 7);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 7), 0);
				t.is(date, weekStart);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 8), 0);
				t.is(date, weekStart);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 9), 0);
				t.is(date, weekStart);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 10), 0);
				t.is(date, weekStart);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 11), 0);
				t.is(date, weekStart);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 12), 0);
				t.is(date, weekStart);
				weekStart = dojox.date.posix.getStartOfWeek(new Date(2007, 0, 13), 0);
				t.is(date, weekStart);
			}
		},
		{
			name: "setIsoWeekOfYear",
			runTest: function(t){
				var date = new Date(2006,10,10);
				var result = dojox.date.posix.setIsoWeekOfYear(date, 1);
				t.is(new Date(2006,0,6), result);
				result = dojox.date.posix.setIsoWeekOfYear(date, 10);
				result = dojox.date.posix.setIsoWeekOfYear(date, 2);
				t.is(new Date(2006,0,13), result);
				result = dojox.date.posix.setIsoWeekOfYear(date, 10);
				t.is(new Date(2006,2,10), result);
				result = dojox.date.posix.setIsoWeekOfYear(date, 52);
				t.is(new Date(2006,11,29), result);
				var result = dojox.date.posix.setIsoWeekOfYear(date, -1);
				t.is(new Date(2006,11,29), result);
				var result = dojox.date.posix.setIsoWeekOfYear(date, -2);
				t.is(new Date(2006,11,22), result);
				var result = dojox.date.posix.setIsoWeekOfYear(date, -10);
				t.is(new Date(2006,9,27), result);
				
				date = new Date(2004,10,10);
				result = dojox.date.posix.setIsoWeekOfYear(date, 1);
				t.is(new Date(2003,11,31), result);
				result = dojox.date.posix.setIsoWeekOfYear(date, 2);
				t.is(new Date(2004,0,7), result);
				result = dojox.date.posix.setIsoWeekOfYear(date, -1);
				t.is(new Date(2004,11,29), result);
			}
		},
		{
			name: "getIsoWeekOfYear",
			runTest: function(t){
				var week = dojox.date.posix.getIsoWeekOfYear(new Date(2006,0,1));
				t.is(52, week);
				week = dojox.date.posix.getIsoWeekOfYear(new Date(2006,0,4));
				t.is(1, week);
				week = dojox.date.posix.getIsoWeekOfYear(new Date(2006,11,31));
				t.is(52, week);
				week = dojox.date.posix.getIsoWeekOfYear(new Date(2007,0,1));
				t.is(1, week);
				week = dojox.date.posix.getIsoWeekOfYear(new Date(2007,11,31));
				t.is(53, week);
				week = dojox.date.posix.getIsoWeekOfYear(new Date(2008,0,1));
				t.is(1, week);
				week = dojox.date.posix.getIsoWeekOfYear(new Date(2007,11,31));
				t.is(53, week);
			}
		},
		{
			name: "getIsoWeeksInYear",
			runTest: function(t){
				// 44 long years in a 400 year cycle.
				var longYears = [4, 9, 15, 20, 26, 32, 37, 43, 48, 54, 60, 65, 71, 76, 82,
					88,	93, 99, 105, 111, 116, 122, 128, 133, 139, 144, 150, 156, 161, 167,
					172, 178, 184, 189, 195, 201, 207, 212, 218, 224, 229, 235, 240, 246,
					252, 257, 263, 268, 274, 280, 285, 291, 296, 303, 308, 314, 320, 325,
					331, 336, 342, 348, 353, 359, 364, 370, 376, 381, 387, 392, 398];
			
				var i, j, weeks, result;
				for(i=0; i < 400; i++) {
					weeks = 52;
					if(i == longYears[0]) { weeks = 53; longYears.shift(); }
					result = dojox.date.posix.getIsoWeeksInYear(new Date(2000 + i, 0, 1));
					t.is(/*weeks +" weeks in "+ (2000+i), */weeks, result);
				}
			}
		}
	]
);
