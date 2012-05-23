dojo.provide("dojox.date.tests.buddhist.Date");
dojo.require("dojox.date.buddhist");
dojo.require("dojox.date.buddhist.Date");
dojo.require("dojox.date.buddhist.locale");
dojo.require("dojo.date.locale");

//dojo.requireLocalization("dojo.cldr", "gregorian");
//dojo.requireLocalization("dojo.cldr", "buddhist");

tests.register("dojox.date.tests.buddhist.Date",
	[
		{
			// see tests for dojo.date.locale for setup info

			name: "setup",
			setUp: function(){
				var partLocaleList = ["th"];

				dojo.forEach(partLocaleList, function(locale){
					dojo.requireLocalization("dojo.cldr", "gregorian", locale);
					dojo.requireLocalization("dojo.cldr", "buddhist", locale);
				});
			},
			runTest: function(t){
			},
			tearDown: function(){
				//Clean up bundles that should not exist if
				//the test is re-run.
			//				delete dojo.cldr.nls.greg;
			//				delete dojo.cldr.nls.buddhist;
			}
		},
		{
			name: "toGregorian",
			runTest: function(t){
				var dateBuddhist = new dojox.date.buddhist.Date(2551, 11, 19); //Buddhist.Date month 0-12
				var dateGregorian = dateBuddhist.toGregorian();
				t.is(0, dojo.date.compare(new Date(2008, 11, 19), dateGregorian, "date"));//Date month 0-11
				
				dateBuddhist = new dojox.date.buddhist.Date(2548, 3, 18);
				dateGregorian = dateBuddhist.toGregorian();
				t.is(0, dojo.date.compare(new Date(2005, 3, 18), dateGregorian, "date"));
				
				dateBuddhist = new dojox.date.buddhist.Date(2550, 7, 10);
				dateGregorian = dateBuddhist.toGregorian();
				t.is(0, dojo.date.compare(new Date(2007, 7, 10), dateGregorian, "date"));
				
				dateBuddhist = new dojox.date.buddhist.Date(2552, 4, 20);
				dateGregorian = dateBuddhist.toGregorian();
				t.is(0, dojo.date.compare(new Date(2009, 4, 20), dateGregorian, "date"));
				
				dateBuddhist = new dojox.date.buddhist.Date(2553, 6, 31);
				dateGregorian = dateBuddhist.toGregorian();
				t.is(0, dojo.date.compare(new Date(2010, 6, 31), dateGregorian, "date"));
				
				dateBuddhist = new dojox.date.buddhist.Date(2554, 9, 1);
				dateGregorian = dateBuddhist.toGregorian();
				t.is(0, dojo.date.compare(new Date(2011, 9, 1), dateGregorian, "date"));
			}
		},
		{
			name: "fromGregorian",
			runTest: function(t){
				var dateGregorian = new Date(2009, 3, 12);
				var dateBuddhistFromGreg = new dojox.date.buddhist.Date(dateGregorian);
				t.is(0, dojo.date.compare( dateBuddhistFromGreg.toGregorian(), dateGregorian, "date"));
				t.is(0, dojo.date.compare( dateBuddhistFromGreg.toGregorian(), dateGregorian));
				
				dateGregorian = new Date(2008, 11, 18);  //Date month 0-11
				dateBuddhistFromGreg = new dojox.date.buddhist.Date(dateGregorian);
				t.is(0, dojox.date.buddhist.compare(new dojox.date.buddhist.Date(2551, 11, 18), dateBuddhistFromGreg, "date")); //Buddhist.Date month 0-12
	
				dateGregorian = new Date(2005, 3, 18);
				dateBuddhistFromGreg = new dojox.date.buddhist.Date(dateGregorian);
				t.is(0, dojox.date.buddhist.compare(new dojox.date.buddhist.Date(2548, 3, 18), dateBuddhistFromGreg, "date"));
				
				dateGregorian = new Date(2007, 7, 10);
				dateBuddhistFromGreg = new dojox.date.buddhist.Date(dateGregorian);
				t.is(0, dojox.date.buddhist.compare(new dojox.date.buddhist.Date(2550, 7, 10), dateBuddhistFromGreg, "date"));
				
				dateGregorian = new Date(2009, 4, 20);
				dateBuddhistFromGreg = new dojox.date.buddhist.Date(dateGregorian);
				t.is(0, dojox.date.buddhist.compare(new dojox.date.buddhist.Date(2552, 4, 20), dateBuddhistFromGreg, "date"));
				
				dateGregorian = new Date(2010, 6, 31);
				dateBuddhistFromGreg = new dojox.date.buddhist.Date(dateGregorian);
				t.is(0, dojox.date.buddhist.compare(new dojox.date.buddhist.Date(2553, 6, 31), dateBuddhistFromGreg, "date"));
				
				dateGregorian = new Date(2011, 9, 1);
				dateBuddhistFromGreg = new dojox.date.buddhist.Date(dateGregorian);
				t.is(0, dojox.date.buddhist.compare(new dojox.date.buddhist.Date(2554, 9, 1), dateBuddhistFromGreg, "date"));
			}
		},
		{
			name: "compare",
			runTest: function(t){
				var dateBuddhist = new dojox.date.buddhist.Date(2552, 5, 16);
				var dateBuddhist1 = new dojox.date.buddhist.Date(2550,  10,  25);
				t.is(1, dojo.date.compare(dateBuddhist.toGregorian(), dateBuddhist1.toGregorian()));
				t.is(-1, dojo.date.compare(dateBuddhist1.toGregorian(), dateBuddhist.toGregorian()));
			}
		},
		{
			name: "add_and_difference",
			runTest: function(t){
				var dateBuddhist = new dojox.date.buddhist.Date(2552, 5, 16);
				var dateBuddhistLeap = new dojox.date.buddhist.Date(2551, 5, 16);
				
				var dateBuddhistAdd = dojox.date.buddhist.add(dateBuddhist, "month",  18);
				var dateBuddhistAddLeap = dojox.date.buddhist.add(dateBuddhistLeap, "month",  18);
				t.is(0, 18 - dojox.date.buddhist.difference(dateBuddhist, dateBuddhistAdd, "month"));
				t.is(0, 18 - dojox.date.buddhist.difference(dateBuddhistLeap, dateBuddhistAddLeap, "month"));
				
				var dateBuddhistAdd1= dojox.date.buddhist.add(dateBuddhist, "year", 2);
				t.is(0,  2 - dojox.date.buddhist.difference(dateBuddhist, dateBuddhistAdd1, "year"));
				t.is(0,  2 - dojox.date.buddhist.difference(dateBuddhistLeap, dojox.date.buddhist.add(dateBuddhistLeap, "year", 2), "year"));
				
				var dateBuddhistAdd2= dojox.date.buddhist.add(dateBuddhist, "week",  12);
				t.is(0, 12 - dojox.date.buddhist.difference(dateBuddhist, dateBuddhistAdd2, "week"));
				t.is(0,  12 - dojox.date.buddhist.difference(dateBuddhistLeap, dojox.date.buddhist.add(dateBuddhistLeap, "week", 12), "week"));
							
				var dateBuddhistAdd3= dojox.date.buddhist.add(dateBuddhist, "weekday", 20);
				t.is(0, 20 - dojox.date.buddhist.difference(dateBuddhist, dateBuddhistAdd3, "weekday"));
				t.is(0,  20 - dojox.date.buddhist.difference(dateBuddhistLeap, dojox.date.buddhist.add(dateBuddhistLeap, "weekday", 20), "weekday"));
				
				var dateBuddhistAdd4= dojox.date.buddhist.add(dateBuddhist, "day", -50)
				t.is(0, -50 - dojox.date.buddhist.difference(dateBuddhist, dateBuddhistAdd4, "day"));
				t.is(0, -50 - dojox.date.buddhist.difference(dateBuddhistLeap, dojox.date.buddhist.add(dateBuddhistLeap, "day", -50), "day"));
									
				var dateBuddhistAdd5= dojox.date.buddhist.add(dateBuddhist, "hour", 200);
				t.is(0, 200 - dojox.date.buddhist.difference(dateBuddhist, dateBuddhistAdd5, "hour"));
				t.is(0, 200 - dojox.date.buddhist.difference(dateBuddhistLeap, dojox.date.buddhist.add(dateBuddhistLeap, "hour", 200), "hour"));
				
				var dateBuddhistAdd6= dojox.date.buddhist.add(dateBuddhist, "minute", -200);
				t.is(0, -200 - dojox.date.buddhist.difference(dateBuddhist, dateBuddhistAdd6, "minute"));
				t.is(0, -200 - dojox.date.buddhist.difference(dateBuddhistLeap, dojox.date.buddhist.add(dateBuddhistLeap, "minute", -200), "minute"));
				
				var dateBuddhistDiff = new dojox.date.buddhist.Date(2552, 5, 17);
				t.is(1, dojox.date.buddhist.difference(dateBuddhist, dateBuddhistDiff));
			}
		},
		{
			name: "parse_and_format",
			runTest: function(t){
				var dateBuddhist = new dojox.date.buddhist.Date(2552, 5, 16);
					
				var options = {formatLength:'short'};
				str= dojox.date.buddhist.locale.format(dateBuddhist, options);
				dateBuddhist1 = dojox.date.buddhist.locale.parse(str, options);
				t.is(0, dojo.date.compare(dateBuddhist.toGregorian(), dateBuddhist1.toGregorian(), 'date'));
				
				var pat = 'dd/MM/yy h:m:s';
				 options = {datePattern:pat, selector:'date'};
				 str= dojox.date.buddhist.locale.format(dateBuddhist, options);
				 dateBuddhist1 = dojox.date.buddhist.locale.parse(str, options);
				 t.is(0, dojo.date.compare(dateBuddhist.toGregorian(), dateBuddhist1.toGregorian(), 'date'));
				 
				pat = 'dd#MM#yy HH$mm$ss';
				 options = {datePattern:pat, selector:'date'};
				 str= dojox.date.buddhist.locale.format(dateBuddhist, options);
				 dateBuddhist1 = dojox.date.buddhist.locale.parse(str, options);
				  t.is(0, dojo.date.compare(dateBuddhist.toGregorian(), dateBuddhist1.toGregorian(), 'date'));
				
				
				 pat = 'HH$mm$ss';
				 options = {timePattern:pat, selector:'time'};
				 str= dojox.date.buddhist.locale.format(dateBuddhist, options);
				 dateBuddhist1 = dojox.date.buddhist.locale.parse(str, options);
				gregDate = dojo.date.locale.parse(str, options);
				t.is(0, dojo.date.compare(gregDate, dateBuddhist1.toGregorian(), 'time'));
								 	
			}
		},
		{
			name: "addMilliseconds",
			runTest: function(t){												
				var buddhistDates = [
							[5771, 8, 21, 10, 30],
							[5771, 8, 21, 2, 2],
							[5771, 8, 21, 8, 10], // "absolute" index of month, non-leap year
							[5771, 8, 21, 12, 59],
							[5771, 8, 21, 3, 33]
						];
						
				var dates = [
							[1432, 8, 21, 10, 30],
							[1432, 8, 21, 2, 2],
							[1432, 8, 21, 8, 10], // "absolute" index of month, non-leap year
							[1432, 8, 21, 12, 59],
							[1432, 8, 21, 3, 33]
						];
						
				var traceAttributes = function(date){
					console.log("getHours():" + date.getHours()+" getMinutes():"+date.getMinutes()+" getSeconds():"+date.getSeconds()+" getMilliseconds():"+date.getMilliseconds());
				};
						
				var dateBuddhist, date2;
				dojo.forEach(buddhistDates, function(date, i){
					dateBuddhist = new dojox.date.buddhist.Date(date[0], date[1], date[2], date[3], date[4]);
					date2 = new Date(dates[i][0], dates[i][1], dates[i][2], dates[i][3], dates[i][4]);			
		
					var newBuddhistDate = dojox.date.buddhist.add(dateBuddhist, "millisecond",  1200);
					var newDate = dojo.date.add(date2, "millisecond",  1200);
					t.is(newBuddhistDate.getHours(), newDate.getHours(), "Hours are different");
					t.is(newBuddhistDate.getMinutes(), newDate.getMinutes(), "Minutes are different");
					t.is(newBuddhistDate.getSeconds(), newDate.getSeconds(), "Seconds are different");
					t.is(newBuddhistDate.getMilliseconds(), newDate.getMilliseconds(), "Milliseconds are different");
					//traceAttributes(newBuddhistDate);

					newBuddhistDate = dojox.date.buddhist.add(dateBuddhist, "millisecond",  12022);
					newDate = dojo.date.add(date2, "millisecond",  12022);
					t.is(newBuddhistDate.getHours(), newDate.getHours(), "Hours are different");
					t.is(newBuddhistDate.getMinutes(), newDate.getMinutes(), "Minutes are different");
					t.is(newBuddhistDate.getSeconds(), newDate.getSeconds(), "Seconds are different");
					t.is(newBuddhistDate.getMilliseconds(), newDate.getMilliseconds(), "Milliseconds are different");
					//traceAttributes(newBuddhistDate);

					newBuddhistDate = dojox.date.buddhist.add(dateBuddhist, "millisecond",  120422);
					newDate = dojo.date.add(date2, "millisecond",  120422);
					t.is(newBuddhistDate.getHours(), newDate.getHours(), "Hours are different");
					t.is(newBuddhistDate.getMinutes(), newDate.getMinutes(), "Minutes are different");
					t.is(newBuddhistDate.getSeconds(), newDate.getSeconds(), "Seconds are different");
					t.is(newBuddhistDate.getMilliseconds(), newDate.getMilliseconds(), "Milliseconds are different");
					//traceAttributes(newBuddhistDate);

					newBuddhistDate = dojox.date.buddhist.add(dateBuddhist, "millisecond",  1204422);
					newDate = dojo.date.add(date2, "millisecond",  1204422);
					t.is(newBuddhistDate.getHours(), newDate.getHours(), "Hours are different");
					t.is(newBuddhistDate.getMinutes(), newDate.getMinutes(), "Minutes are different");
					t.is(newBuddhistDate.getSeconds(), newDate.getSeconds(), "Seconds are different");
					t.is(newBuddhistDate.getMilliseconds(), newDate.getMilliseconds(), "Milliseconds are different");
					//traceAttributes(newBuddhistDate);
				});
			}
		}
	]
);
