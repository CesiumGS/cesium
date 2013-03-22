define(["dojo/has", "doh/main", "require"], function(has, doh, require){
	doh.register("tests.window.viewport", require.toUrl("./window/viewport.html"));
	// IE9+ cannot handle quirks mode in test runner, see #14321
	has("ie") >= 9 || doh.register("tests.window.viewportQuirks", require.toUrl("./window/viewportQuirks.html"));
	doh.register("tests.window.test_scroll", require.toUrl("./window/test_scroll.html"), 99999999);
});