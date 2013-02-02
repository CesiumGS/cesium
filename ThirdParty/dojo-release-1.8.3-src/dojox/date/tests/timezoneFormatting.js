dojo.provide("dojox.date.tests.timezoneFormatting");
dojo.require("dojox.date.timezone");
dojo.require("dojo.date");

tests.register("dojox.date.tests.timezoneFormatting",
	[
		{
			name: "timezone format",
			setUp: function(){
				var partLocaleList = ["en-us", "fr-fr", "es", "de-at", "ja-jp", "zh-cn"];

				dojo.forEach(partLocaleList, function(locale){
					dojo.requireLocalization("dojo.cldr", "gregorian", locale);
				});
			},
			runTest: function(t){
				var date = new Date(1155257712345);
					// This translates to:
					//   GMT		Friday, August 11, 2006 at 00:55:12 GMT
					//   Denver		Thursday, August 10, 2006 at 6:55:12 PM MDT
					//   Anchorage	Thursday, August 10, 2006 at 4:55:12 PM AKDT
					//   Jerusalem	Friday, August 11, 2006 at 3:55:12 AM IDT
					//   Sydney		Friday, August 11, 2006 at 10:55:12 AM EST
					//   Tokyo		Friday, August 11, 2006 at 9:55:12 AM JST
					//   Shanghai	Friday, August 11, 2006 at 8:55:12 AM CST
					//   Paris		Friday, August 11, 2006 at 2:55:12 AM CEST
					//   Vienna		Friday, August 11, 2006 at 2:55:12 AM CEST
					//   Madrid		Friday, August 11, 2006 at 2:55:12 AM CEST
					
				//////////////////////
				//  Custom Selector:
				var selectorOpts = {datePattern: "EEEE, MMMM d, y 'at'", timePattern: "HH:mm:ss z", locale: "en-us"};
				doh.is("Friday, August 11, 2006 at 00:55:12 GMT", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone: 'GMT'})));
				doh.is("Thursday, August 10, 2006 at 18:55:12 MDT", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone: 'America/Denver'})));
				doh.is("Thursday, August 10, 2006 at 16:55:12 AKDT", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone: 'America/Anchorage'})));
				doh.is("Friday, August 11, 2006 at 03:55:12 IDT", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone: 'Asia/Jerusalem'})));
				doh.is("Friday, August 11, 2006 at 10:55:12 EST", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone: 'Australia/Sydney'})));
				doh.is("Friday, August 11, 2006 at 09:55:12 JST", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone: 'Asia/Tokyo'})));
				doh.is("Friday, August 11, 2006 at 08:55:12 CST", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone: 'Asia/Shanghai'})));
				doh.is("Friday, August 11, 2006 at 02:55:12 CEST", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone: 'Europe/Madrid'})));
				
												
				//////////////////////
				//  Full Selectors:
				// New York (in en-us)
				doh.is("Thursday, August 10, 2006 8:55:12 PM EDT", dojo.date.locale.format(date, {formatLength:'full',locale:'en-us',timezone:'America/New_York'}));
				// Tokyo (in ja-jp)
				doh.is("2006\u5e748\u670811\u65e5\u91d1\u66dc\u65e5 9\u664255\u520612\u79d2 JST", dojo.date.locale.format(date, {formatLength:'full',locale:'ja-jp',timezone:'Asia/Tokyo'}));
				// Shanghai (in zh-cn)
				doh.is("2006\u5e748\u670811\u65e5\u661f\u671f\u4e94CST\u4e0a\u53488\u65f655\u520612\u79d2", dojo.date.locale.format(date, {formatLength:'full',locale:'zh-cn',timezone:'Asia/Shanghai'}));
				// Paris (in fr-fr)
				doh.is("vendredi 11 août 2006 02:55:12 CEST", dojo.date.locale.format(date, {formatLength:'full',locale:'fr-fr',timezone:'Europe/Paris'}));
				// Vienna (in de-at)
				doh.is("Freitag, 11. August 2006 02:55:12 CEST", dojo.date.locale.format(date, {formatLength:'full',locale:'de-at',timezone:'Europe/Vienna'}));
				// Madrid (in es)
				doh.is("viernes, 11 de agosto de 2006 02:55:12 CEST", dojo.date.locale.format(date, {formatLength:'full',locale:'es',timezone:'Europe/Madrid'}));
				
				//////////////////////
				//  Tricky Dates:
				date = new Date(1225605599000); // 1 second before New York goes off DST - NY and LA are 3 hours apart
				selectorOpts = {formatLength: "full", locale: "en-us"};
				doh.is("Sunday, November 2, 2008 1:59:59 AM EDT", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone:'America/New_York'})));
				doh.is("Saturday, November 1, 2008 10:59:59 PM PDT", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone:'America/Los_Angeles'})));
				
				date = new Date(1225605600000); // New York goes off DST - NY and LA are 2 hours apart
				doh.is("Sunday, November 2, 2008 1:00:00 AM EST", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone:'America/New_York'})));
				doh.is("Saturday, November 1, 2008 11:00:00 PM PDT", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone:'America/Los_Angeles'})));
				
				date = new Date(1225616400000); // LA goes off DST - NY and LA are 3 hours apart again
				doh.is("Sunday, November 2, 2008 4:00:00 AM EST", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone:'America/New_York'})));
				doh.is("Sunday, November 2, 2008 1:00:00 AM PST", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone:'America/Los_Angeles'})));
				
				date = new Date(1257062399000); // Denver on DST - Denver is 1 hr ahead of Phoenix
				doh.is("Sunday, November 1, 2009 1:59:59 AM MDT", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone:'America/Denver'})));
				doh.is("Sunday, November 1, 2009 12:59:59 AM MST", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone:'America/Phoenix'})));
				
				date = new Date(1257062400000); // Denver off DST - Denver is same time as Phoenix
				doh.is("Sunday, November 1, 2009 1:00:00 AM MST", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone:'America/Denver'})));
				doh.is("Sunday, November 1, 2009 1:00:00 AM MST", dojo.date.locale.format(date, dojo.delegate(selectorOpts, {timezone:'America/Phoenix'})));
			}
		}
	]
);