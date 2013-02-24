dojo.provide("dojox.date.tests.hebrew.Date");
dojo.require("dojox.date.hebrew");
dojo.require("dojox.date.hebrew.Date");
dojo.require("dojox.date.hebrew.locale");
dojo.require("dojo.date.locale");

dojo.requireLocalization("dojo.cldr", "gregorian");
dojo.requireLocalization("dojo.cldr", "hebrew");

tests.register("dojox.date.tests.hebrew.Date",
	[
		{
			// see tests for dojo.date.locale for setup info

			name: "setup",
			setUp: function(){
				var partLocaleList = ["he", "en"];

				dojo.forEach(partLocaleList, function(locale){
					dojo.requireLocalization("dojo.cldr", "gregorian", locale);
					dojo.requireLocalization("dojo.cldr", "hebrew", locale);
				});
			},
			runTest: function(t){
			},
			tearDown: function(){
				//Clean up bundles that should not exist if
				//the test is re-run.
			//				delete dojo.cldr.nls.gregorian;
			//				delete dojo.cldr.nls.hebrew;
			}
		},
		{
			name: "compare",
			runTest: function(t){
				var dateHebrew = new dojox.date.hebrew.Date(5769, 5, 16);
				var dateHebrew1 = new dojox.date.hebrew.Date(5758,  10,  25);
				t.is(1, dojo.date.compare(dateHebrew.toGregorian(), dateHebrew1.toGregorian()));
				t.is(-1, dojo.date.compare(dateHebrew1.toGregorian(), dateHebrew.toGregorian()));
			}
		},
		{
			name: "toGregorian_fromGregorian",
			runTest: function(t){
			
			//Hebrew month names
			var TISHRI = 0 , HESHVAN = 1, KISLEV = 2, TEVET = 3, SHVAT = 4 , ADARI = 5, ADAR = 6, NISAN= 7 , IYAR= 8 , SIVAN= 9 , TAMMUZ = 10, AV = 11 , ELUL = 12;
				//hebrew.Date month names
				//Gregorian Date month 1-12 -  for readability
				var dateTable = [
					[1239, 9, 8,   5000,TISHRI,1],
					[1240, 9, 25,  5001,TISHRI,1],
					[1298, 4, 17, 5058, NISAN,  27],
					[1391, 7, 11, 5151, AV, 1],
					[1492, 5, 9, 5252, IYAR, 3],
					[1560, 4, 4, 5320,  ADAR, 27],
					[1648, 7, 10, 5408, TAMMUZ, 20],
					[1903, 5, 19, 5663, IYAR, 22],
					[1929, 9, 24, 5689, ELUL, 19],
					[1941, 10, 29, 5702, HESHVAN, 8],
					[1943, 5, 19, 5703, IYAR, 14],
					[1943, 11, 6, 5704, HESHVAN, 8],
					[1992, 4, 15, 5752, NISAN, 12],
					[1996, 3, 25, 5756, NISAN, 5],
					[2005, 4, 18, 5765, NISAN, 9],
					[2007, 7, 12, 5767, TAMMUZ, 26],
					[2007, 10, 13, 5768, HESHVAN, 1],
					[2007, 11, 11, 5768, KISLEV, 1],
					[2007, 12, 10, 5768, TEVET, 1],
					[2008, 1, 8, 5768, SHVAT, 1],
					[2008, 2, 7, 5768, ADARI, 1],
					[2008, 3, 8, 5768, ADAR, 1],
					[2008, 4, 6, 5768, NISAN, 1],
					[2008, 5, 6, 5768, IYAR, 1],
					[2008, 6, 4, 5768, SIVAN, 1],
					[2008, 7, 4, 5768, TAMMUZ, 1],
					[2008, 8, 2, 5768, AV, 1],
					[2008, 8, 4, 5768, AV, 3],
					[2008, 9, 5, 5768, ELUL, 5],
					[2008, 8, 5, 5768, AV, 4],
					[2008, 9, 11, 5768, ELUL, 11],
					[2008, 12, 19,  5769, KISLEV, 22],
					[2009, 1, 26, 5769, SHVAT, 1],
					[2009, 2, 25, 5769, ADARI, 1], //incorrect, not leap year , the month is set to ADAR
					[2009, 2, 25, 5769, ADAR, 1],
					[2009, 3, 26, 5769, NISAN, 1],
					[2009, 5, 24, 5769, SIVAN, 1],
					[2009, 7, 22, 5769, AV, 1],
					[2009, 8, 21, 5769, ELUL, 1],
					[2010, 7, 2, 5770,  TAMMUZ, 20],
					[2011, 10, 1, 5772, TISHRI, 3],
					[2038, 12, 9, 5799, KISLEV, 12],
					[2094, 8, 17, 5854, ELUL, 5]
				];

					

				var dateHebrew, dateGregorian;
				//toGregorian
				dojo.forEach(dateTable, function(d, i){
					dateHebrew = new dojox.date.hebrew.Date(d[3], d[4], d[5]);
					dateGregorian = dateHebrew.toGregorian();
					t.is(0, dojo.date.compare(new Date(d[0], d[1]-1, d[2]), dateGregorian, "date"));
				});
				
				//fromGregorian
				dojo.forEach(dateTable, function(d, i){
					dateGregorian = new  Date(d[0], d[1]-1, d[2]);
					dateHebrew = new dojox.date.hebrew.Date(dateGregorian);
					testHebrew = new dojox.date.hebrew.Date(d[3], d[4], d[5]);
					t.is(0, dojo.date.compare(testHebrew.toGregorian() , dateHebrew.toGregorian(),  "date"));
				});
				
				//test for invalid date, toGregorian and fromGregorian should return invalid date
				var invDate = new Date("");
				var hDate = new dojox.date.hebrew.Date(invDate);
				var hebrInvDate = new dojox.date.hebrew.Date("");
				t.is(true, isNaN(hDate));
				t.is(true, isNaN(hDate.toGregorian()));
				t.is(true, isNaN(hebrInvDate));
				
			}
		},
		{
			name: "getDay",
			runTest: function(t){
				 var dateTable = [
					[5769, 0, 11, 5],
					[5769, 1, 3, 6],
					[5769, 2, 10, 0],
					[5769, 3, 23, 1],
					[5769, 6, 21, 2],
					[5769, 6, 22, 3],
					[5769, 7, 15, 4]
				];
					dojo.forEach(dateTable, function(d, i){
					var date = new  dojox.date.hebrew.Date(d[0], d[1], d[2]);
					t.is(d[3], 	date.getDay());
				});
				
			}
		},
		{
			name: "getDaysInHebrewMonth",
			runTest: function(t){
					
				 var dateTable = [
					[5768, 1, 29], //HESHVAN
					[5770, 1, 30], //HESHVAN
					[5768, 5, 30], //ADARI
					[5769, 5, 0], //ADARI
					[5768, 2, 29], //KISLEV,
					[5769, 2, 30] //KISLEV,
				];
				
				dojo.forEach(dateTable, function(d, i){
					var date = new  dojox.date.hebrew.Date(d[0], d[1], 1);
					t.is(d[2], 	dojox.date.hebrew.getDaysInMonth(date));
				});
			}
		},
		{
			name: "add_difference",
			runTest: function(t){
		//	5766, 5767, 5769, 5770, 5772, 5772, 5773, 5775 - non leap
		//      5765, 5768, 5771, 5774 - leap
		
		//Hebrew month names
				var TISHRI = 0 , HESHVAN = 1, KISLEV = 2, TEVET = 3, SHVAT = 4 , ADARI = 5, ADAR = 6, NISAN= 7 , IYAR= 8 , SIVAN= 9 , TAMMUZ = 10, AV = 11 , ELUL = 12;
				var start = [
						[5767, TAMMUZ, 5769, SIVAN],
						[5767, TAMMUZ, 5772, IYAR],
						[5767, 0, 5768, TISHRI],
						[5775, KISLEV, 5773, TEVET],
						[5767,  TISHRI , 5765, HESHVAN],
						[5768, TEVET, 5768, ADARI],
						[5768, IYAR, 5768, ADAR],
						[5769, TEVET, 5769, ADAR],
						[5769, IYAR, 5769, SHVAT],
						[5769, ELUL, 5770, TISHRI],
						[5769, ELUL, 5769, AV]
					];
					var add =[24, 60, 12, -24,-24, 2, -2, 2, -3, 1, -1];
						
					var dateHebStart, dateHebEnd, res, dateHebRes;
					dojo.forEach(start, function(s, i){
						dateHebStart = new dojox.date.hebrew.Date( s[0], s[1], 1);
						dateHebRes = dojox.date.hebrew.add(dateHebStart, "month", add[i]);

						t.is(0, dateHebRes.getMonth() - s[3]);
						t.is(0, dateHebRes.getFullYear() - s[2]);
					});
					
					//month difference
					dojo.forEach(start, function(s, i){
						dateHebRes = new dojox.date.hebrew.Date( s[2], s[3], 1);
						dateHebStart =  new dojox.date.hebrew.Date( s[0], s[1], 1);
						t.is(add[i], dojox.date.hebrew.difference(dateHebStart , dateHebRes, "month"));
					});
					
					//different fields
					var fields =  [
								[   5757, TISHRI,    1,     "year",    10,     5767, TISHRI,    1 ],
								[   5758, KISLEV,   30,      "year",   -1,     5757, KISLEV,   29 ],
								[   5769, NISAN,   30,      "year",   -1,     5768, NISAN,  30 ],
								[   5768, ADARI,  30,      "year",   1,     5769, ADAR,  29 ],
								[   5757, TISHRI,   30,     "month",   1,     5757, HESHVAN,  29 ],
								[   5762, AV,       30,      "day",    1,     5762, ELUL,  1 ],
								[   5762, ELUL,      1,     "day",   -1,     5762, AV, 30 ],
								[   5769,  TAMMUZ,  27,  "day",  10,  5769, AV, 8],
								[   5757, KISLEV,    1,    "day",   30,     5757, TEVET,    2 ],   // 29-day month
								[   5758, KISLEV,    1,     "day",   31,     5758, TEVET,    2 ],   // 30-day month
								[   5769,  AV,   27,  "day",  10,  5769, ELUL, 7],
								[   5769,  ELUL,   27,  "day",  10,  5770, TISHRI, 8],
							        [   5769,  TAMMUZ,  27,  "day",  -30, 5769, SIVAN, 27],
								[   5769,  AV,   1,  "day",  -60,  5769,	IYAR, 29],
								[   5769,  SHVAT, 	30, "day", 1, 	5769, ADAR, 1],
								[   5769,  TAMMUZ,  27,  "weekday", 10,  5769, AV, 12],
								[   5769,  KISLEV,   1,  "weekday", 1, 5769, KISLEV, 3],
								[   5769,  NISAN,  1,  "weekday",  -5,  5769, ADAR, 23],
								[   5769,  AV,   7,  "weekday", -10, 5769, TAMMUZ, 22],
								[   5769,  AV,   12,  "weekday", -6, 5769, AV, 2],
								[   5769,  AV,   11,  "weekday", -6, 5769, AV, 2],
								[   5769,  AV,   10,  "weekday", -6, 5769,AV, 2],
								[   5769,  AV,   11,  "weekday", 6, 5769, AV, 19],
								[   5769,  AV,   10,  "weekday", 6, 5769, AV, 19],
								[   5769,  AV,   11,  "weekday", 12, 5769, AV, 27],
								[   5769,  AV,   10,  "weekday", 12, 5769, AV, 27],
								[   5769,  AV,  9,  "weekday", 12, 5769, AV, 27],
								[   5769,  NISAN, 	29, "week", 1, 5769, IYAR, 6],
								[   5771,  NISAN, 	1, "week", -4, 5771, ADAR, 2],
								[   5771,  NISAN, 	1, "week", -8, 5771, ADARI, 4],
								[   5769,  AV, 	17, "week", 2, 5769, ELUL, 1],
								[   5769,  AV, 	18, "week", -1, 5769, AV, 11]						];
						
					//test add
					dojo.forEach( fields, function(f, i){
						dateHebStart =  new dojox.date.hebrew.Date( f[0], f[1], f[2]);
						dateHebEnd = dojox.date.hebrew.add(dateHebStart, f[3], f[4]);
						dateHebRes = new dojox.date.hebrew.Date( f[5], f[6], f[7]);
						t.is(0, dojo.date.compare (dateHebRes.toGregorian(), dateHebEnd.toGregorian()));
						if(f[3] == "week"){
							t.is(dateHebStart.getDay(), dateHebEnd.getDay());
						}
					});
					
					//test difference
					dojo.forEach( fields, function(f, i){
						dateHebStart =  new dojox.date.hebrew.Date( f[0], f[1], f[2]);
						dateHebRes = new dojox.date.hebrew.Date( f[5], f[6], f[7]);
						res = dojox.date.hebrew.difference(dateHebStart, dateHebRes, f[3]);
						t.is(f[4], res);
					});
					
					// check that setMonth (getMonth + d) is not the same as add month (d), due to adar
					dateHebStart = new dojox.date.hebrew.Date( 5769, KISLEV, 1);
					var dateHebAdd =  dojox.date.hebrew.add(dateHebStart, "month", 4);
					dateHebStart.setMonth(dateHebStart.getMonth() +4);
					t.assertFalse(dateHebStart.getMonth() == dateHebAdd.getMonth());
				
				}
		},
		{
			name: "consistency_of_add_and_difference",
			runTest: function(t){
				var dateHebrew = new dojox.date.hebrew.Date(5769, 4, 16);
				var dateHebrewLeap = new dojox.date.hebrew.Date(5768, 5, 16);
				
			//	var m =  ["TISHRI " , "HESHVAN", "KISLEV", "TEVET", "SHVAT" , "ADARI", "ADAR", "NISAN" , "IYAR" , "SIVAN" , "TAMMUZ", "AV" , "ELUL"];
				
				var amouts = [2, 5, 6, 7, 8,12, 18,20, 24, 50, -3, -4,  -5, -6, -7, -8, -9, -10, -50, 200, -200];
				var dateHebrewAdd, dateHebrewAddLeap;
				
				dojo.forEach( amouts, function(amount, i){
					dateHebrewAdd = dojox.date.hebrew.add(dateHebrew, "month",  amount);
					dateHebrewAddLeap = dojox.date.hebrew.add(dateHebrewLeap, "month",  amount);
					t.is(dojox.date.hebrew.difference(dateHebrew, dateHebrewAdd, "month"), amount);
					t.is(amount, dojox.date.hebrew.difference(dateHebrewLeap, dateHebrewAddLeap, "month"));
												
					dateHebrewAdd= dojox.date.hebrew.add(dateHebrew, "year", amount);
					t.is(amount, dojox.date.hebrew.difference(dateHebrew, dateHebrewAdd, "year"));
					t.is(amount, dojox.date.hebrew.difference(dateHebrewLeap, dojox.date.hebrew.add(dateHebrewLeap, "year", amount), "year"));
					
					dateHebrewAdd= dojox.date.hebrew.add(dateHebrew, "week",  amount);
					t.is(amount,  dojox.date.hebrew.difference(dateHebrew, dateHebrewAdd, "week"));
					t.is(amount,  dojox.date.hebrew.difference(dateHebrewLeap, dojox.date.hebrew.add(dateHebrewLeap, "week", amount), "week"));
									
					dateHebrewAdd= dojox.date.hebrew.add(dateHebrew, "weekday", amount);
					t.is(amount,  dojox.date.hebrew.difference(dateHebrew, dateHebrewAdd, "weekday"));
					dateHebrewAddLeap = dojox.date.hebrew.add(dateHebrewLeap, "weekday", amount);
					t.is(amount,  dojox.date.hebrew.difference(dateHebrewLeap, dojox.date.hebrew.add(dateHebrewLeap, "weekday", amount), "weekday"));
					
					dateHebrewAdd= dojox.date.hebrew.add(dateHebrew, "day", amount)
					t.is(amount,  dojox.date.hebrew.difference(dateHebrew, dateHebrewAdd, "day"));
					t.is(amount, dojox.date.hebrew.difference(dateHebrewLeap, dojox.date.hebrew.add(dateHebrewLeap, "day", amount), "day"));
										
					dateHebrewAdd= dojox.date.hebrew.add(dateHebrew, "hour", amount);
					t.is(amount,  dojox.date.hebrew.difference(dateHebrew, dateHebrewAdd, "hour"));
					t.is(amount,  dojox.date.hebrew.difference(dateHebrewLeap, dojox.date.hebrew.add(dateHebrewLeap, "hour", amount), "hour"));
					
					dateHebrewAdd= dojox.date.hebrew.add(dateHebrew, "minute", amount);
					t.is(amount,  dojox.date.hebrew.difference(dateHebrew, dateHebrewAdd, "minute"));
					t.is(amount,  dojox.date.hebrew.difference(dateHebrewLeap, dojox.date.hebrew.add(dateHebrewLeap, "minute", amount), "minute"));
					
					dateHebrewAdd= dojox.date.hebrew.add(dateHebrew, "second", amount);
					t.is(amount,  dojox.date.hebrew.difference(dateHebrew, dateHebrewAdd, "second"));
					t.is(amount,  dojox.date.hebrew.difference(dateHebrewLeap, dojox.date.hebrew.add(dateHebrewLeap, "second", amount), "second"));
					
					dateHebrewAdd= dojox.date.hebrew.add(dateHebrew, "millisecond", amount);
					t.is(amount,  dojox.date.hebrew.difference(dateHebrew, dateHebrewAdd, "millisecond"));
					t.is(amount,  dojox.date.hebrew.difference(dateHebrewLeap, dojox.date.hebrew.add(dateHebrewLeap, "millisecond", amount), "millisecond"));
				 });
				 
				var dateHebrewDiff = new dojox.date.hebrew.Date(5769, 4, 17);
				t.is(1, dojox.date.hebrew.difference(dateHebrew, dateHebrewDiff));
			}
		},
		{
			name: "getMonth_setMonth",
			runTest: function(t){
			var nonLeap = "5766, 5767, 5769, 5770, 5772, 5772, 5773, 5775";
		        var leap = "5765, 5768, 5771, 5774";
		// ELUL - 12,  ADAR -6, ADARI -5
				var dateHebrew = new dojox.date.hebrew.Date(5765, 1, 1);
				for (var year = 5766; year < 5866; year++){
					dateHebrew.setFullYear(year);
					t.is(year,dateHebrew.getFullYear());
					dateHebrew.setMonth(12);
					t.is(12,dateHebrew.getMonth());
					dateHebrew.setMonth(6);
					t.is(6,dateHebrew.getMonth());
					if (leap.match(year)){
						dateHebrew.setMonth(5);
						t.is(5,dateHebrew.getMonth());
					}
					if (nonLeap.match(year)){
						dateHebrew.setMonth(5); // non leap year does not have  ADARI, set month to ADAR
						t.is(6,dateHebrew.getMonth());
					}
				}
			}
		},
		{
			name: "hebrew_numerals",
			runTest: function(t){
				var i, hebrNum;
				for ( i = 1 ; i <= 30; i++){
					//test day hebrew numerals
					t.is(dojox.date.hebrew.numerals.parseDayHebrewLetters(dojox.date.hebrew.numerals.getDayHebrewLetters(i)), i);
					t.is(dojox.date.hebrew.numerals.parseDayHebrewLetters(dojox.date.hebrew.numerals.getDayHebrewLetters(i, true)), i); //with geresh
					//test month hebrew numerals
					if ( i <= 13){
						t.is(dojox.date.hebrew.numerals.parseMonthHebrewLetters(dojox.date.hebrew.numerals.getMonthHebrewLetters(i-1)), i-1);
					}
				}
				//test year hebrew numerals
				for ( i = 5001; i < 6000; i+=27){
					t.is(dojox.date.hebrew.numerals.parseYearHebrewLetters(dojox.date.hebrew.numerals.getYearHebrewLetters(i)), i);
				}
				//hebrew numerals are not relevant for year < 5001 or > 5999
				t.assertFalse (dojox.date.hebrew.numerals.parseYearHebrewLetters(dojox.date.hebrew.numerals.getYearHebrewLetters(2345)) == 2345);
				t.assertFalse (dojox.date.hebrew.numerals.parseYearHebrewLetters(dojox.date.hebrew.numerals.getYearHebrewLetters(6789)) == 6789);
			}
		},
		{
			name: "parse_and_format",
			runTest: function(t){
	
				//test Hebrew and English locale
												
				var dates = [
							[5768, 5, 1],
							[5768, 1, 29],
							[5769, 6, 16], // "absolute" index of month, non-leap year
							[5769, 11, 2],
							[5770, 0, 2]
						];
						
				var dateHebrew, dateHebrew1;
				dojo.forEach(dates, function(date, i){
					dateHebrew = new dojox.date.hebrew.Date(date[0], date[1], date[2]);
					
					var options = [{formatLength:'full', locale:'he'},{formatLength:'long', locale:'he'},{formatLength:'medium', locale:'he'},{formatLength:'short', locale:'he'},
						{formatLength:'full', locale:'en'},{formatLength:'long', locale:'en'},{formatLength:'medium', locale:'en'},{formatLength:'short', locale:'en'}];
					dojo.forEach(options, function(opt, i){
						str= dojox.date.hebrew.locale.format(dateHebrew, opt);
						var option = "{" +opt+", locale:'he'}";
						dateHebrew1 = dojox.date.hebrew.locale.parse(str, opt);
						t.is(0, dojo.date.compare(dateHebrew.toGregorian(), dateHebrew1.toGregorian(), 'date'));
					});
					
					var pattern = ['d M yy', 'dd/MM/yy h:m:s',  'dd#MM#yy HH$mm$ss', 'dd MMMM yyyy'];
					dojo.forEach( pattern, function(pat, i){
						options = {datePattern:pat, selector:'date', locale:'he'};
						str= dojox.date.hebrew.locale.format(dateHebrew, options);
						dateHebrew1 = dojox.date.hebrew.locale.parse(str, options);
						t.is(0, dojo.date.compare(dateHebrew.toGregorian(), dateHebrew1.toGregorian(), 'date'));
					});
				});
						
				dateHebrew = new dojox.date.hebrew.Date(5769, 6, 3, 15, 3, 59);
				pattern = 'HH$mm$ss';
				options = {timePattern:pattern, selector:'time'};
				str= dojox.date.hebrew.locale.format(dateHebrew, options);
				dateHebrew1 = dojox.date.hebrew.locale.parse(str, options);
				var gregDate = dojo.date.locale.parse(str, options);
				t.is(0, dojo.date.compare(gregDate, dateHebrew1.toGregorian(), 'time'));
				
				pattern = "h:m:s";
				options = {timePattern:pattern, selector:'time'};
				str= dojox.date.hebrew.locale.format(dateHebrew, options);
				t.is(str, "3:3:59");
			}
		},
		{
			name: "addMilliseconds",
			runTest: function(t){												
				var hebrewDates = [
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
						
				var dateHebrew, date2;
				dojo.forEach(hebrewDates, function(date, i){
					dateHebrew = new dojox.date.hebrew.Date(date[0], date[1], date[2], date[3], date[4]);
					date2 = new Date(dates[i][0], dates[i][1], dates[i][2], dates[i][3], dates[i][4]);			
		
					var newHebrewDate = dojox.date.hebrew.add(dateHebrew, "millisecond",  1200);
					var newDate = dojo.date.add(date2, "millisecond",  1200);
					t.is(newHebrewDate.getHours(), newDate.getHours(), "Hours are different");
					t.is(newHebrewDate.getMinutes(), newDate.getMinutes(), "Minutes are different");
					t.is(newHebrewDate.getSeconds(), newDate.getSeconds(), "Seconds are different");
					t.is(newHebrewDate.getMilliseconds(), newDate.getMilliseconds(), "Milliseconds are different");
					//traceAttributes(newHebrewDate);

					newHebrewDate = dojox.date.hebrew.add(dateHebrew, "millisecond",  12022);
					newDate = dojo.date.add(date2, "millisecond",  12022);
					t.is(newHebrewDate.getHours(), newDate.getHours(), "Hours are different");
					t.is(newHebrewDate.getMinutes(), newDate.getMinutes(), "Minutes are different");
					t.is(newHebrewDate.getSeconds(), newDate.getSeconds(), "Seconds are different");
					t.is(newHebrewDate.getMilliseconds(), newDate.getMilliseconds(), "Milliseconds are different");
					//traceAttributes(newHebrewDate);

					newHebrewDate = dojox.date.hebrew.add(dateHebrew, "millisecond",  120422);
					newDate = dojo.date.add(date2, "millisecond",  120422);
					t.is(newHebrewDate.getHours(), newDate.getHours(), "Hours are different");
					t.is(newHebrewDate.getMinutes(), newDate.getMinutes(), "Minutes are different");
					t.is(newHebrewDate.getSeconds(), newDate.getSeconds(), "Seconds are different");
					t.is(newHebrewDate.getMilliseconds(), newDate.getMilliseconds(), "Milliseconds are different");
					//traceAttributes(newHebrewDate);

					newHebrewDate = dojox.date.hebrew.add(dateHebrew, "millisecond",  1204422);
					newDate = dojo.date.add(date2, "millisecond",  1204422);
					t.is(newHebrewDate.getHours(), newDate.getHours(), "Hours are different");
					t.is(newHebrewDate.getMinutes(), newDate.getMinutes(), "Minutes are different");
					t.is(newHebrewDate.getSeconds(), newDate.getSeconds(), "Seconds are different");
					t.is(newHebrewDate.getMilliseconds(), newDate.getMilliseconds(), "Milliseconds are different");
					//traceAttributes(newHebrewDate);
				});
			}
		}
	]
);
