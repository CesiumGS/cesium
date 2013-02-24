define(["../main", "doh/main", "require", "../cache", "../_base/url"], function(dojo, doh, require){
	doh.register("tests.cache", [{
			name: "dojo.cache",
			runTest: function(t){
				var expected = "<h1>Hello World</h1>";

				t.is(expected, dojo.trim(dojo.cache("dojo.tests.cache", "regular.html")));
				t.is(expected, dojo.trim(dojo.cache("dojo.tests.cache", "sanitized.html", {sanitize: true})));

				//Test object variant for module.
				var objPath = require.toUrl("dojo/tests/cache/object.html");
				t.is(expected, dojo.trim(dojo.cache(new dojo._Url(objPath), {sanitize: true})));

				//Just a couple of other passes just to make sure on manual inspection that the
				//files are loaded over the network only once.
				t.is(expected, dojo.trim(dojo.cache("dojo.tests.cache", "regular.html")));
				t.is(expected, dojo.trim(dojo.cache("dojo.tests.cache", "sanitized.html", {sanitize: true})));
				t.is(expected, dojo.trim(dojo.cache(new dojo._Url(objPath), {sanitize: true})));

				//Make sure unset cache does not throw errors
				t.is(null, dojo.cache("dojo.tests.cache", "regular.html", null));

				//Set empty string as value
				t.is("", dojo.cache("dojo.tests.cache", "regular.html", ""));
				t.is("", dojo.cache("dojo.tests.cache", "regular.html"));
			}
		}
	]);
});
