define(["../main", "doh/main", "require", "../currency"], function(dojo, doh, require){

	var runTest= function(dojo, t){
		t.is("\u20ac123.45", dojo.currency.format(123.45, {currency: "EUR", locale: "en-us"}));
		t.is("$123.45", dojo.currency.format(123.45, {currency: "USD", locale: "en-us"}));
		t.is("$1,234.56", dojo.currency.format(1234.56, {currency: "USD", locale: "en-us"}));
		t.is("US$123.45", dojo.currency.format(123.45, {currency: "USD", locale: "en-ca"}));
		t.is("$123.45", dojo.currency.format(123.45, {currency: "CAD", locale: "en-ca"}));
		t.is("CA$123.45", dojo.currency.format(123.45, {currency: "CAD", locale: "en-us"}));
		t.is("123,45\xa0\u20ac", dojo.currency.format(123.45, {currency: "EUR", locale: "de-de"}));
		t.is("1.234,56\xa0\u20ac", dojo.currency.format(1234.56, {currency: "EUR", locale: "de-de"}));
		// There is no special currency symbol for ADP, so expect the ISO code instead
		t.is("ADP123", dojo.currency.format(123, {currency: "ADP", locale: "en-us"}));
		t.is("$1,234", dojo.currency.format(1234, {currency: "USD", fractional: false, locale: "en-us"}));

		t.is(123.45, dojo.currency.parse("$123.45", {currency: "USD", locale: "en-us"}));
		t.is(1234.56, dojo.currency.parse("$1,234.56", {currency: "USD", locale: "en-us"}));
		t.is(123.45, dojo.currency.parse("123,45 \u20ac", {currency: "EUR", locale: "de-de"}));
		t.is(123.45, dojo.currency.parse("123,45\xa0\u20ac", {currency: "EUR", locale: "de-de"}));
		t.is(1234.56, dojo.currency.parse("1.234,56 \u20ac", {currency: "EUR", locale: "de-de"}));
		t.is(1234.56, dojo.currency.parse("1.234,56\u20ac", {currency: "EUR", locale: "de-de"}));

		t.is(1234, dojo.currency.parse("$1,234", {currency: "USD", locale: "en-us"}));
		t.is(1234, dojo.currency.parse("$1,234", {currency: "USD", fractional: false, locale: "en-us"}));
		t.t(isNaN(dojo.currency.parse("$1,234", {currency: "USD", fractional: true, locale: "en-us"})));
	};

	if(require.async){
		require(["../main", "../currency", "../i18n"], function(dojo){
			doh.register("tests.currency", {
				name: "currency",
				timeout: 2000,
				runTest: function(t){
					var
						def = new doh.Deferred(),
						deps= ["dojo"];
					dojo.forEach(["en-us", "en-ca", "de-de"], function(locale){
						deps.push(dojo.getL10nName("dojo/cldr", "currency", locale));
						deps.push(dojo.getL10nName("dojo/cldr", "number", locale));
					});
					require(deps, function(dojo){
						runTest(dojo, t);
						def.callback(true);
					});
					return def;
				}
			});
		});
	}else{ // tests for the v1.x loader/i18n machinery
		tests.register("tests.currency",{
			// Test formatting and parsing of currencies in various locales pre-built in dojo.cldr
			// NOTE: we can't set djConfig.extraLocale before bootstrapping unit tests, so directly
			// load resources here for specific locales:
			name: "currency",
			setUp: function(){
				var partLocaleList = ["en-us", "en-ca", "de-de"];
				for(var i = 0 ; i < partLocaleList.length; i ++){
					dojo.requireLocalization("dojo.cldr","currency",partLocaleList[i]);
					dojo.requireLocalization("dojo.cldr","number",partLocaleList[i]);
				}
			},
			runTest: function(t){
				runTest(dojo, t);
			}
		});
	}
});
