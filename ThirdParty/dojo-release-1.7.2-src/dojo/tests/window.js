define(["doh", "require"], function(doh, require){
	doh.register("tests.window.viewport", require.toUrl("./window/viewport.html"));
	doh.register("tests.window.viewportQuirks", require.toUrl("./window/viewportQuirks.html"));
	doh.register("tests.window.test_scroll", require.toUrl("./window/test_scroll.html"), 99999999);
});