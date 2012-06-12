dojo.provide("dojox.date.tests.relative");
dojo.require("dojox.date.relative");
dojo.require("dojo.date");

dojo.requireLocalization("dojo.cldr", "gregorian");

tests.register("dojox.date.tests.relative",
	[
		{
			// Test formatting and parsing of dates in various locales pre-built in dojo.cldr
			// NOTE: we can't set djConfig.extraLocale before bootstrapping unit tests, so directly
			// load resources here for specific locales:

			name: "date.locale",
			setUp: function(){
				var partLocaleList = ["en-us", "zh-cn"];

				dojo.forEach(partLocaleList, function(locale){
					dojo.requireLocalization("dojo.cldr", "gregorian", locale);
				});
			},
			runTest: function(t){
			},
			tearDown: function(){
			}
		},
		{
			name: "format_dates",
			runTest: function(t){
				//relative to "today", default locale
				var d = new Date();
				t.is(dojo.date.locale.format(d, {selector: "time"}), dojox.date.relative.format(d));
				
				//en-us: test the various relativities
				var opts = {locale: "en-us", relativeDate: new Date(2009, 1, 1, 5, 27, 34)};
				t.is("3:32 AM", dojox.date.relative.format(new Date(2009, 1, 1, 3, 32, 26), opts));
				t.is("Sat 8:32 PM", dojox.date.relative.format(new Date(2009, 0, 31, 20, 32, 26), opts));
				t.is("Jan 1", dojox.date.relative.format(new Date(2009, 0, 1, 20, 32, 26), opts));
				t.is("Jan 1, 2008", dojox.date.relative.format(new Date(2008, 0, 1, 0), opts));
				
				//en-us: test various options as well as future dates and edge cases
				t.is("8:32 PM", dojox.date.relative.format(new Date(2009, 1, 1, 20, 32, 26), opts));
				t.is("12:00 AM", dojox.date.relative.format(new Date(2009, 1, 1, 0), opts));
				t.is("Jan 31", dojox.date.relative.format(new Date(2009, 0, 31, 20, 32, 26), dojo.delegate(opts, {weekCheck: false})));
				t.is("Jan 1", dojox.date.relative.format(new Date(2009, 0, 1, 20, 32, 26), opts));
				t.is("Feb 2", dojox.date.relative.format(new Date(2009, 1, 2, 20, 32, 26), opts));
				t.is("Jan 1, 2010", dojox.date.relative.format(new Date(2010, 0, 1, 0), opts));

				//zh-tw: test the various relativities
				opts.locale = "zh-cn";
				t.is("\u4e0a\u53483:32", dojox.date.relative.format(new Date(2009, 1, 1, 3, 32, 26), opts));
				t.is("\u5468\u516d \u4e0b\u53488:32", dojox.date.relative.format(new Date(2009, 0, 31, 20, 32, 26), opts));
				t.is("1\u67081\u65e5", dojox.date.relative.format(new Date(2009, 0, 1, 20, 32, 26), opts));
				t.is("2008-1-1", dojox.date.relative.format(new Date(2008, 0, 1, 0), opts));
			}
		}
	]
);
