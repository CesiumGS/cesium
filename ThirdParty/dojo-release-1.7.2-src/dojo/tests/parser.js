define(["doh", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests.parser", require.toUrl("./parser.html"), 30000);
	}
});
