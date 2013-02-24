define(["../main", "doh/main", "../has", "../i18n", "require"], function(dojo, doh, has, i18n, require){
	var
		getAsyncTest = function(value, locale){
			return function(){
				var def = new doh.Deferred();
				require([dojo.getL10nName("dojo/tests", "salutations", locale)], function(bundle){
					doh.assertEqual(value, bundle.hello);
					def.callback(true);
				});
				return def;
			};
		},

		getSyncTest = function(value, locale){
			return function(){
				doh.assertEqual(value, dojo.i18n.getLocalization("dojo/tests", "salutations", locale).hello);
			};
		},

		getFixture = function(locale, value){
			return {
				name: "salutations-"+locale,
				timeout: 2000,
				runTest: (require.async ? getAsyncTest : getSyncTest)(value, locale)
			};
		},

		testSet = [
			// Locale which overrides root translation
			getFixture("de", "Hallo"),
			// Locale which does not override root translation
			getFixture("en", "Hello"),
			// Locale which overrides its parent
			getFixture("en-au", "G'day"),
			// Locale which does not override its parent
			getFixture("en-us", "Hello"),
			// Locale which overrides its parent
			getFixture("en-us-texas", "Howdy"),
			// 3rd level variant which overrides its parent
			getFixture("en-us-new_york", "Hello"),
			// Locale which overrides its grandparent
			getFixture("en-us-new_york-brooklyn", "Yo"),
			// Locale which does not have any translation available
			getFixture("xx", "Hello"),
			// A double-byte string. Everything should be read in as UTF-8 and treated as unicode within Javascript.
			getFixture("zh-cn", "\u4f60\u597d")
		];


	doh.register("tests.i18n", testSet);
	if(has("host-browser")){
		doh.register("tests.i18n.extra.sync", require.toUrl("./i18n.html"), {async:0});
		doh.register("tests.i18n.extra.async", require.toUrl("./i18n.html"), {async:1});
	}
});
