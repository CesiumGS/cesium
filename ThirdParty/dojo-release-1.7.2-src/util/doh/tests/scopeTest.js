// to run this test and see it pass, try (note sandbox and async parameters)
//	 * path/to/dojotoolkit/util/doh/runner.html?test=doh/tests/scopeTest&sandbox&async
//
// to run this test and see it fail, try either of (note no sandbox parameter)
//	 * path/to/dojotoolkit/util/doh/runner.html?test=doh/tests/scopeTest
//	 * path/to/dojotoolkit/util/doh/runner.html?test=doh/tests/scopeTest&async

define(["doh/runner"], function(doh) {
	var global= this;
	doh.register("scope", function(t){
		t.is(global.dojo, undefined, "dojo global was defined");
		t.isNot(global.dohDojo, undefined, "dohDojo global was not defined");
		t.isNot(require("dohDojo"), undefined, "dohDojo module was not defined");
	});
});
