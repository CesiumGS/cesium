dojo.provide("dojo.tests.date.locale");

dojo.require("dojo.date.locale");

tests.register("tests.date.locale",
	[
		{
			// Test formatting and parsing of dates in various locales pre-built in dojo.cldr
			// NOTE: we can't set djConfig.extraLocale before bootstrapping unit tests, so directly
			// load resources here for specific locales:

			name: "date.locale",
			runTest: function(t){
				var partLocaleList = ["en-us", "fr-fr", "es", "de-at", "ja-jp", "zh-cn"];
				if(dojo.isAsync){
					var def = new doh.Deferred(),
						deps = dojo.map(partLocaleList, function(locale){
							return dojo.getL10nName("dojo/cldr", "gregorian", locale);
						});
					require(deps, function(){
						def.callback(true);
					});
					return def;
				}else{ // tests for the v1.x loader/i18n machinery
					dojo.forEach(partLocaleList, function(locale){
						dojo.requireLocalization("dojo.cldr", "gregorian", locale);
					});
				}
			},
			tearDown: function(){
				//Clean up bundles that should not exist if
				//the test is re-run.
				//delete dojo.cldr.nls.gregorian;
			}
		},
		{
			name: "isWeekend",
			runTest: function(t){
				var thursday = new Date(2006, 8, 21);
				var friday = new Date(2006, 8, 22);
				var saturday = new Date(2006, 8, 23);
				var sunday = new Date(2006, 8, 24);
				var monday = new Date(2006, 8, 25);
				t.f(dojo.date.locale.isWeekend(thursday, 'en-us'));
				t.t(dojo.date.locale.isWeekend(saturday, 'en-us'));
				t.t(dojo.date.locale.isWeekend(sunday, 'en-us'));
				t.f(dojo.date.locale.isWeekend(monday, 'en-us'));
//	t.f(dojo.date.locale.isWeekend(saturday, 'en-in'));
//	t.t(dojo.date.locale.isWeekend(sunday, 'en-in'));
//	t.f(dojo.date.locale.isWeekend(monday, 'en-in'));
//	t.t(dojo.date.locale.isWeekend(friday, 'he-il'));
//	t.f(dojo.date.locale.isWeekend(sunday, 'he-il'));
			}
		},
		{
			name: "format",
			runTest: function(t){

	var date = new Date(2006, 7, 11, 0, 55, 12, 345);

	t.is("Friday, August 11, 2006", dojo.date.locale.format(date, {formatLength:'full',selector:'date', locale:'en-us'}));
	t.is("vendredi 11 ao\xFBt 2006", dojo.date.locale.format(date, {formatLength:'full',selector:'date', locale:'fr-fr'}));
	t.is("Freitag, 11. August 2006", dojo.date.locale.format(date, {formatLength:'full',selector:'date', locale:'de-at'}));
	t.is("2006\u5E748\u670811\u65E5\u91D1\u66DC\u65E5", dojo.date.locale.format(date, {formatLength:'full',selector:'date', locale:'ja-jp'}));

	t.is("8/11/06", dojo.date.locale.format(date, {formatLength:'short',selector:'date', locale:'en-us'}));
	t.is("11/08/06", dojo.date.locale.format(date, {formatLength:'short',selector:'date', locale:'fr-fr'}));
	t.is("11.08.06", dojo.date.locale.format(date, {formatLength:'short',selector:'date', locale:'de-at'}));
	t.is("2006/08/11", dojo.date.locale.format(date, {formatLength:'short',selector:'date', locale:'ja-jp'}));

	t.is("6", dojo.date.locale.format(date, {datePattern:'E', selector:'date'}));

	t.is("12:55 AM", dojo.date.locale.format(date, {formatLength:'short',selector:'time', locale:'en-us'}));
	t.is("12:55:12", dojo.date.locale.format(date, {timePattern:'h:m:s',selector:'time'}));
	t.is("12:55:12.35", dojo.date.locale.format(date, {timePattern:'h:m:s.SS',selector:'time'}));
	t.is("24:55:12.35", dojo.date.locale.format(date, {timePattern:'k:m:s.SS',selector:'time'}));
	t.is("0:55:12.35", dojo.date.locale.format(date, {timePattern:'H:m:s.SS',selector:'time'}));
	t.is("0:55:12.35", dojo.date.locale.format(date, {timePattern:'K:m:s.SS',selector:'time'}));

	t.is("11082006", dojo.date.locale.format(date, {datePattern:"ddMMyyyy", selector:"date"}));

	t.is("12 o'clock AM", dojo.date.locale.format(date, {datePattern:"hh 'o''clock' a", selector:"date", locale: 'en'}));

	t.is("11/08/2006 12:55am", dojo.date.locale.format(date, {datePattern:"dd/MM/yyyy", timePattern:"hh:mma", locale: 'en', am:"am", pm:"pm"}));

	// compare without timezone
	t.is("\u4e0a\u534812\u65f655\u520612\u79d2", dojo.date.locale.format(date, {formatLength:'full',selector:'time', locale:'zh-cn'}).replace(/^.*(\u4e0a\u5348.*)/,"$1"));
			}
		},
		{
			name: "parse_dates",
			runTest: function(t){

	var aug_11_2006 = new Date(2006, 7, 11, 0);

	//en: 'short' fmt: M/d/yy
	// Tolerate either 8 or 08 for month part.
	t.is( aug_11_2006, dojo.date.locale.parse("08/11/06", {formatLength:'short', selector:'date', locale:'en'}));
	t.is( aug_11_2006, dojo.date.locale.parse("8/11/06", {formatLength:'short', selector:'date', locale:'en'}));
	// Tolerate yyyy input in yy part...
	t.is( aug_11_2006, dojo.date.locale.parse("8/11/2006", {formatLength:'short', selector:'date', locale:'en'}));
	// ...but not in strict mode
	t.f( Boolean(dojo.date.locale.parse("8/11/2006", {formatLength:'short', selector:'date', locale:'en', strict:true})));

	// test dates with no spaces
	t.is( aug_11_2006, dojo.date.locale.parse("11Aug2006", {selector: 'date', datePattern: 'ddMMMyyyy', locale: 'en'}));
	t.is( new Date(2006, 7, 1), dojo.date.locale.parse("Aug2006", {selector: 'date', datePattern: 'MMMyyyy', locale: 'en'}));
	t.is( new Date(2010, 10, 19), dojo.date.locale.parse("111910", {fullyear: false, datePattern: "MMddyy", selector: "date"}));

	//en: 'medium' fmt: MMM d, yyyy
	// Tolerate either 8 or 08 for month part.
	t.is( aug_11_2006, dojo.date.locale.parse("Aug 11, 2006", {formatLength:'medium', selector:'date', locale:'en'}));
	t.is( aug_11_2006, dojo.date.locale.parse("Aug 11, 2006", {formatLength:'medium', selector:'date', locale:'en'}));
	// Tolerate abbreviating period in month part...
	t.is( aug_11_2006, dojo.date.locale.parse("Aug. 11, 2006", {formatLength:'medium', selector:'date', locale:'en'}));
	// ...but not in strict mode
	t.f( Boolean(dojo.date.locale.parse("Aug. 11, 2006", {formatLength:'medium', selector:'date', locale:'en', strict:true})));

	// Note: 06 for year part will be translated literally as the year 6 C.E.
	var aug_11_06CE = new Date(2006, 7, 11, 0);
	aug_11_06CE.setFullYear(6); //literally the year 6 C.E.
	t.is( aug_11_06CE, dojo.date.locale.parse("Aug 11, 06", {selector:'date', datePattern:'MMM dd, yyyy', locale: 'en', strict:true}));

	//en: 'long' fmt: MMMM d, yyyy
	t.is( aug_11_2006, dojo.date.locale.parse("August 11, 2006", {formatLength:'long', selector:'date', locale:'en'}));

	//en: 'full' fmt: EEEE, MMMM d, yyyy
	t.is( aug_11_2006, dojo.date.locale.parse("Friday, August 11, 2006", {formatLength:'full', selector:'date', locale:'en'}));
	//TODO: wrong day-of-week should fail
	//t.f( Boolean(dojo.date.locale.parse("Thursday, August 11, 2006", {formatLength:'full', selector:'date', locale:'en'})));
	//TODO: Whitespace tolerance
	//	t.is( aug_11_2006, dojo.date.locale.parse(" August 11, 2006", {formatLength:'long', selector:'date', locale:'en'}));
	//	t.is( aug_11_2006, dojo.date.locale.parse("August  11, 2006", {formatLength:'long', selector:'date', locale:'en'}));
	//	t.is( aug_11_2006, dojo.date.locale.parse("August 11 , 2006", {formatLength:'long', selector:'date', locale:'en'}));
	//	t.is( aug_11_2006, dojo.date.locale.parse("August 11,  2006", {formatLength:'long', selector:'date', locale:'en'}));
	//	t.is( aug_11_2006, dojo.date.locale.parse("August 11, 2006 ", {formatLength:'long', selector:'date', locale:'en'}));

	//Simple Validation Tests
	//catch "month" > 12 (note: month/day reversals are common when user expectation isn't met wrt european versus US formats)
	t.f( Boolean(dojo.date.locale.parse("15/1/2005", {formatLength:'short', selector:'date', locale:'en'})));
	//day of month typo rolls over to the next month
	t.f( Boolean(dojo.date.locale.parse("Aug 32, 2006", {formatLength:'medium', selector:'date', locale:'en'})));

	//German (de)
	t.is( aug_11_2006, dojo.date.locale.parse("11.08.06", {formatLength:'short', selector:'date', locale:'de'}));
	t.f( Boolean(dojo.date.locale.parse("11.8/06", {formatLength:'short', selector:'date', locale:'de'})));
	t.f( Boolean(dojo.date.locale.parse("11.8x06", {formatLength:'short', selector:'date', locale:'de'})));
	t.f( Boolean(dojo.date.locale.parse("11.13.06", {formatLength:'short', selector:'date', locale:'de'})));
	t.f( Boolean(dojo.date.locale.parse("11.0.06", {formatLength:'short', selector:'date', locale:'de'})));
	t.f( Boolean(dojo.date.locale.parse("32.08.06", {formatLength:'short', selector:'date', locale:'de'})));

	//Spanish (es)
	//es: 'short' fmt: d/MM/yy
	t.is( aug_11_2006, dojo.date.locale.parse("11/08/06", {formatLength:'short', selector:'date', locale:'es'}));
	t.is( aug_11_2006, dojo.date.locale.parse("11/8/06", {formatLength:'short', selector:'date', locale:'es'}));
	// Tolerate yyyy input in yy part...
	t.is( aug_11_2006, dojo.date.locale.parse("11/8/2006", {formatLength:'short', selector:'date', locale:'es'}));
	// ...but not in strict mode
	t.f( Boolean(dojo.date.locale.parse("11/8/2006", {formatLength:'short', selector:'date', locale:'es', strict:true})));
	//es: 'medium' fmt: dd-MMM-yy (not anymore as of CLDR 1.5.1)
//	t.is( aug_11_2006, dojo.date.locale.parse("11-ago-06", {formatLength:'medium', selector:'date', locale:'es'}));
//	t.is( aug_11_2006, dojo.date.locale.parse("11-ago-2006", {formatLength:'medium', selector:'date', locale:'es'}));
	// Tolerate abbreviating period in month part...
//	t.is( aug_11_2006, dojo.date.locale.parse("11-ago.-2006", {formatLength:'medium', selector:'date', locale:'es'}));
	// ...but not in strict mode
//	t.f( Boolean(dojo.date.locale.parse("11-ago.-2006", {formatLength:'medium', selector:'date', locale:'es', strict:true})));
	//es: 'long' fmt: d' de 'MMMM' de 'yyyy
	t.is( aug_11_2006, dojo.date.locale.parse("11 de agosto de 2006", {formatLength:'long', selector:'date', locale:'es'}));
	//case-insensitive month...
	t.is( aug_11_2006, dojo.date.locale.parse("11 de Agosto de 2006", {formatLength:'long', selector:'date', locale:'es'}));
	//...but not in strict mode
	t.f( Boolean(dojo.date.locale.parse("11 de Agosto de 2006", {formatLength:'long', selector:'date', locale:'es', strict:true})));
	//es 'full' fmt: EEEE d' de 'MMMM' de 'yyyy
	t.is( aug_11_2006, dojo.date.locale.parse("viernes, 11 de agosto de 2006", {formatLength:'full', selector:'date', locale:'es'}));
	//case-insensitive day-of-week...
	t.is( aug_11_2006, dojo.date.locale.parse("Viernes, 11 de agosto de 2006", {formatLength:'full', selector:'date', locale:'es'}));
	//...but not in strict mode
	t.f( Boolean(dojo.date.locale.parse("Viernes, 11 de agosto de 2006", {formatLength:'full', selector:'date', locale:'es', strict:true})));

	//Japanese (ja)
	//note: to avoid garbling from non-utf8-aware editors that may touch this file, using the \uNNNN format
	//for expressing double-byte chars.
	//toshi (year): \u5e74
	//getsu (month): \u6708
	//nichi (day): \u65e5
	//kinyoubi (Friday): \u91d1\u66dc\u65e5
	//zenkaku space: \u3000

	//ja: 'short' fmt: yy/MM/dd (note: the "short" fmt isn't actually defined in the CLDR data...)
	t.is( aug_11_2006, dojo.date.locale.parse("06/08/11", {formatLength:'short', selector:'date', locale:'ja'}));
	t.is( aug_11_2006, dojo.date.locale.parse("06/8/11", {formatLength:'short', selector:'date', locale:'ja'}));
 	// Tolerate yyyy input in yy part...
	t.is( aug_11_2006, dojo.date.locale.parse("2006/8/11", {formatLength:'short', selector:'date', locale:'ja'}));
	// ...but not in strict mode
	t.f( Boolean(dojo.date.locale.parse("2006/8/11", {formatLength:'short', selector:'date', locale:'ja', strict:true})));
	//ja: 'medium' fmt: yyyy/MM/dd
	t.is( aug_11_2006, dojo.date.locale.parse("2006/08/11", {formatLength:'medium', selector:'date', locale:'ja'}));
	t.is( aug_11_2006, dojo.date.locale.parse("2006/8/11", {formatLength:'medium', selector:'date', locale:'ja'}));
	//ja: 'long' fmt: yyyy'\u5e74'\u6708'd'\u65e5'
	t.is( aug_11_2006, dojo.date.locale.parse("2006\u5e748\u670811\u65e5", {formatLength:'long', selector:'date', locale:'ja'}));
	//ja 'full' fmt: yyyy'\u5e74'M'\u6708'd'\u65e5'EEEE
	t.is( aug_11_2006, dojo.date.locale.parse("2006\u5e748\u670811\u65e5\u91d1\u66dc\u65e5", {formatLength:'full', selector:'date', locale:'ja'}));

	//TODO: Whitespace tolerance
	//tolerate ascii space
	//	t.is( aug_11_2006, dojo.date.locale.parse(" 2006\u5e748\u670811\u65e5\u91d1\u66dc\u65e5 ", {formatLength:'full', selector:'date', locale:'ja'}));
	//	t.is( aug_11_2006, dojo.date.locale.parse("2006\u5e74 8\u670811\u65e5 \u91d1\u66dc\u65e5", {formatLength:'full', selector:'date', locale:'ja'}));
	//tolerate zenkaku space
	//	t.is( aug_11_2006, dojo.date.locale.parse("\u30002006\u5e748\u670811\u65e5\u91d1\u66dc\u65e5\u3000", {formatLength:'full', selector:'date', locale:'ja'}));
	//	t.is( aug_11_2006, dojo.date.locale.parse("2006\u5e74\u30008\u670811\u65e5\u3000\u91d1\u66dc\u65e5", {formatLength:'full', selector:'date', locale:'ja'}));

	var apr_11_2006 = new Date(2006, 3, 11, 0);
	//Roundtrip
	var options={formatLength:'medium',selector:'date', locale:'fr-fr'};
	t.is(0, dojo.date.compare(apr_11_2006, dojo.date.locale.parse(dojo.date.locale.format(apr_11_2006, options), options)));

	//Tolerance for abbreviations
	t.is(0, dojo.date.compare(apr_11_2006, dojo.date.locale.parse("11 avr 06", options)));
			}
		},
		{
			name: "parse_dates_neg",
			runTest: function(t){
				t.f(Boolean(dojo.date.locale.parse("2/29/2007", {formatLength: 'short', selector: 'date', locale: 'en'})));
				t.f(Boolean(dojo.date.locale.parse("4/31/2007", {formatLength: 'short', selector: 'date', locale: 'en'})));
				t.f(Boolean(dojo.date.locale.parse("Decemb 30, 2007", {formatLength: 'long', selector: 'date', locale: 'en'})));
			}
		},
		{
			name: "parse_datetimes",
			runTest: function(t){

	var aug_11_2006_12_30_am = new Date(2006, 7, 11, 0, 30);
	var aug_11_2006_12_30_pm = new Date(2006, 7, 11, 12, 30);

	//en: 'short' datetime fmt: M/d/yy h:mm a
	//note: this is concatenation of dateFormat-short and timeFormat-short,
	//cldr provisionally defines datetime fmts as well, but we're not using them at the moment
	t.is( aug_11_2006_12_30_pm, dojo.date.locale.parse("08/11/06 12:30 PM", {formatLength:'short', locale:'en'}));
	//case-insensitive
	t.is( aug_11_2006_12_30_pm, dojo.date.locale.parse("08/11/06 12:30 pm", {formatLength:'short', locale:'en'}));
	//...but not in strict mode
	t.f( Boolean(dojo.date.locale.parse("08/11/06 12:30 pm", {formatLength:'short', locale:'en', strict:true})));

	t.is( aug_11_2006_12_30_am, dojo.date.locale.parse("08/11/06 12:30 AM", {formatLength:'short', locale:'en'}));

	t.is( new Date(2006, 7, 11), dojo.date.locale.parse("11082006", {datePattern:"ddMMyyyy", selector:"date"}));

	t.is( new Date(2006, 7, 31), dojo.date.locale.parse("31Aug2006", {datePattern:"ddMMMyyyy", selector:"date", locale:'en'}));

	t.is(new Date(1970,0,7), dojo.date.locale.parse("007", {datePattern:'DDD',selector:'date'}));
	t.is(new Date(1970,0,31), dojo.date.locale.parse("031", {datePattern:'DDD',selector:'date'}));
	t.is(new Date(1970,3,10), dojo.date.locale.parse("100", {datePattern:'DDD',selector:'date'}));

			}
		},
		{
			name: "parse_times",
			runTest: function(t){
				var time = new Date(2006, 7, 11, 12, 30);
				var tformat = {selector:'time', strict:true, timePattern:"h:mm a", locale:'en'};

				t.is(time.getHours(), dojo.date.locale.parse("12:30 PM", tformat).getHours());
				t.is(time.getMinutes(), dojo.date.locale.parse("12:30 PM", tformat).getMinutes());
			}
		},
		{
			name: "format_patterns",
			runTest: function(t){
				var time = new Date(2006, 7, 11, 12, 30);
				var tformat = {selector:'time', strict:true, timePattern:"h 'o''clock'", locale:'en'};
				t.is(time.getHours(), dojo.date.locale.parse("12 o'clock", tformat).getHours());

				tformat = {selector:'time', strict:true, timePattern:" 'Hour is' h", locale:'en'};
				t.is(time.getHours(), dojo.date.locale.parse(" Hour is 12", tformat).getHours());

				tformat = {selector:'time', strict:true, timePattern:"'Hour is' h", locale:'en'};
				t.is(time.getHours(), dojo.date.locale.parse("Hour is 12", tformat).getHours());
			}
		},
		{
			name: "parse_patterns",
			runTest: function(t){
				var time = new Date(2006, 7, 11, 12, 30);
				var tformat = {selector:'time', strict:true, timePattern:"h 'o''clock'", locale:'en'};
				t.is(time.getHours(), dojo.date.locale.parse("12 o'clock", tformat).getHours());

				tformat = {selector:'time', strict:true, timePattern:" 'Hour is' h", locale:'en'};
				t.is(time.getHours(), dojo.date.locale.parse(" Hour is 12", tformat).getHours());
				tformat = {selector:'time', strict:true, timePattern:"'Hour is' h", locale:'en'};
				t.is(time.getHours(), dojo.date.locale.parse("Hour is 12", tformat).getHours());
			}
		},
		{
			name: "day_of_year",
			runTest: function(t){

//				t.is(23, dojo.date.setDayOfYear(new Date(2006,0,1), 23).getDate());
				t.is(1, dojo.date.locale._getDayOfYear(new Date(2006,0,1)));
				t.is(32, dojo.date.locale._getDayOfYear(new Date(2006,1,1)));
				t.is(72, dojo.date.locale._getDayOfYear(new Date(2007,2,13,0,13)));
				t.is(72, dojo.date.locale._getDayOfYear(new Date(2007,2,13,1,13)));
			}
		},
		{
			name: "week_of_year",
			runTest: function(t){
				t.is(0, dojo.date.locale._getWeekOfYear(new Date(2000,0,1)));
				t.is(1, dojo.date.locale._getWeekOfYear(new Date(2000,0,2)));
				t.is(0, dojo.date.locale._getWeekOfYear(new Date(2000,0,2), 1));
				t.is(0, dojo.date.locale._getWeekOfYear(new Date(2007,0,1)));
				t.is(1, dojo.date.locale._getWeekOfYear(new Date(2007,0,1), 1));
				t.is(27, dojo.date.locale._getWeekOfYear(new Date(2007,6,14)));
				t.is(28, dojo.date.locale._getWeekOfYear(new Date(2007,6,14), 1));
			}
		}
	]
);

/*
// workaround deprecated methods. Should decide whether we should convert the tests or add a helper method (in dojo.date?) to do this.

dojo_validate_isValidTime = function(str, props){
	props = props || {};
	if(!props.format){props.format="h:mm:ss";}
	if(!props.am){props.am="a.m.";}
	if(!props.pm){props.pm="p.m.";}
	var result = false;
	if(/[hk]/.test(props.format) && props.format.indexOf('a') == -1){
		result = dojo.date.locale.parse(str, {selector: 'time', timePattern: props.format + " a"});
	}
	return Boolean(result || dojo.date.locale.parse(str, {selector: 'time', timePattern: props.format}));
}

dojo_validate_is12HourTime = function(str){
	return dojo_validate_isValidTime(str, {format: 'h:mm:ss'}) || 	dojo_validate_isValidTime(str, {format: 'h:mm'});
}

dojo_validate_is24HourTime = function(str){
	return dojo_validate_isValidTime(str, {format: 'H:mm:ss'}) || 	dojo_validate_isValidTime(str, {format: 'H:mm'});
}

dojo_validate_isValidDate = function(str, fmt){
	return Boolean(dojo.date.locale.parse(str, {selector: 'date', datePattern: fmt}));
}

function test_validate_datetime_isValidTime(){
	jum.assertTrue("test1", dojo_validate_isValidTime('5:15:05 pm'));
// FAILURE	jum.assertTrue("test2", dojo_validate_isValidTime('5:15:05 p.m.', {pm: "P.M."} ));
	jum.assertFalse("test3", dojo_validate_isValidTime('5:15:05 f.m.'));
	jum.assertTrue("test4", dojo_validate_isValidTime('5:15 pm', {format: "h:mm a"} ) );
	jum.assertFalse("test5", dojo_validate_isValidTime('5:15 fm', {}) );
	jum.assertTrue("test6", dojo_validate_isValidTime('15:15:00', {format: "H:mm:ss"} ) );
// FAILURE	jum.assertFalse("test7", dojo_validate_isValidTime('15:15:00', {}) );
	jum.assertTrue("test8", dojo_validate_isValidTime('17:01:30', {format: "H:mm:ss"} ) );
	jum.assertFalse("test9", dojo_validate_isValidTime('17:1:30', {format: "H:mm:ss"} ) );
// FAILURE	jum.assertFalse("test10", dojo_validate_isValidTime('17:01:30', {format: "H:m:ss"} ) );
	// Greek
// FAILURE	jum.assertTrue("test11", dojo_validate_isValidTime('5:01:30 \u0924\u0924', {am: "\u0928\u0924", pm: "\u0924\u0924"} ) );
	// Italian
	jum.assertTrue("test12", dojo_validate_isValidTime('17.01.30', {format: "H.mm.ss"} ) );
	// Mexico
// FAILURE	jum.assertTrue("test13", dojo_validate_isValidTime('05:01:30 p.m.', {format: "hh:mm:ss a", am: "a.m.", pm: "p.m."} ) );
}


function test_validate_datetime_is12HourTime(){
	jum.assertTrue("test1", dojo_validate_is12HourTime('5:15:05 pm'));
// FAILURE	jum.assertFalse("test2", dojo_validate_is12HourTime('05:15:05 pm'));
	jum.assertFalse("test3", dojo_validate_is12HourTime('5:5:05 pm'));
	jum.assertFalse("test4", dojo_validate_is12HourTime('5:15:5 pm'));
// FAILURE	jum.assertFalse("test5", dojo_validate_is12HourTime('13:15:05 pm'));
	jum.assertFalse("test6", dojo_validate_is12HourTime('5:60:05 pm'));
	jum.assertFalse("test7", dojo_validate_is12HourTime('5:15:60 pm'));
	jum.assertTrue("test8", dojo_validate_is12HourTime('5:59:05 pm'));
	jum.assertTrue("test9", dojo_validate_is12HourTime('5:15:59 pm'));
// FAILURE	jum.assertFalse("test10", dojo_validate_is12HourTime('5:15:05'));

	// optional seconds
	jum.assertTrue("test11", dojo_validate_is12HourTime('5:15 pm'));
	jum.assertFalse("test12", dojo_validate_is12HourTime('5:15: pm'));
}

function test_validate_datetime_is24HourTime(){
	jum.assertTrue("test1", dojo_validate_is24HourTime('00:03:59'));
	jum.assertTrue("test2", dojo_validate_is24HourTime('22:03:59'));
//FIXME: fix tests or code?
//	jum.assertFalse("test3", dojo_validate_is24HourTime('22:03:59 pm'));
//	jum.assertFalse("test4", dojo_validate_is24HourTime('2:03:59'));
	jum.assertFalse("test5", dojo_validate_is24HourTime('0:3:59'));
	jum.assertFalse("test6", dojo_validate_is24HourTime('00:03:5'));
	jum.assertFalse("test7", dojo_validate_isValidTime('24:03:59', {format: 'kk:mm:ss'}));
	jum.assertFalse("test8", dojo_validate_is24HourTime('02:60:59'));
	jum.assertFalse("test9", dojo_validate_is24HourTime('02:03:60'));

	// optional seconds
	jum.assertTrue("test10", dojo_validate_is24HourTime('22:53'));
	jum.assertFalse("test11", dojo_validate_is24HourTime('22:53:'));
}

function test_validate_datetime_isValidDate(){

	// Month date year
	jum.assertTrue("test1", dojo_validate_isValidDate("08/06/2005", "MM/dd/yyyy"));
	jum.assertTrue("test2", dojo_validate_isValidDate("08.06.2005", "MM.dd.yyyy"));
	jum.assertTrue("test3", dojo_validate_isValidDate("08-06-2005", "MM-dd-yyyy"));
	jum.assertTrue("test4", dojo_validate_isValidDate("8/6/2005", "M/d/yyyy"));
	jum.assertTrue("test5", dojo_validate_isValidDate("8/6", "M/d"));
	jum.assertFalse("test6", dojo_validate_isValidDate("09/31/2005", "MM/dd/yyyy"));
	jum.assertFalse("test7", dojo_validate_isValidDate("02/29/2005", "MM/dd/yyyy"));
	jum.assertTrue("test8", dojo_validate_isValidDate("02/29/2004", "MM/dd/yyyy"));

	// year month date
	jum.assertTrue("test9", dojo_validate_isValidDate("2005-08-06", "yyyy-MM-dd"));
	jum.assertTrue("test10", dojo_validate_isValidDate("20050806", "yyyyMMdd"));

	// year month
	jum.assertTrue("test11", dojo_validate_isValidDate("2005-08", "yyyy-MM"));
	jum.assertTrue("test12", dojo_validate_isValidDate("200508", "yyyyMM"));

	// year
	jum.assertTrue("test13", dojo_validate_isValidDate("2005", "yyyy"));

	// year week day
//TODO: need to support 'w'?
//	jum.assertTrue("test14", dojo_validate_isValidDate("2005-W42-3", "yyyy-'W'ww-d"));
//	jum.assertTrue("test15", dojo_validate_isValidDate("2005W423", "yyyy'W'wwd"));
//	jum.assertFalse("test16", dojo_validate_isValidDate("2005-W42-8", "yyyy-'W'ww-d"));
//	jum.assertFalse("test17", dojo_validate_isValidDate("2005-W54-3", "yyyy-'W'ww-d"));

	// year week
//	jum.assertTrue("test18", dojo_validate_isValidDate("2005-W42", "yyyy-'W'ww"));
//	jum.assertTrue("test19", dojo_validate_isValidDate("2005W42", "yyyy'W'ww"));

	// year ordinal-day
	jum.assertTrue("test20", dojo_validate_isValidDate("2005-292", "yyyy-DDD"));
	jum.assertTrue("test21", dojo_validate_isValidDate("2005292", "yyyyDDD"));
	jum.assertFalse("test22", dojo_validate_isValidDate("2005-366", "yyyy-DDD"));
	jum.assertTrue("test23", dojo_validate_isValidDate("2004-366", "yyyy-DDD"));

	// date month year
	jum.assertTrue("test24", dojo_validate_isValidDate("19.10.2005", "dd.MM.yyyy"));
	jum.assertTrue("test25", dojo_validate_isValidDate("19-10-2005", "d-M-yyyy"));
}
*/
