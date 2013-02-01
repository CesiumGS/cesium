define(["doh/main", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests.behavior", require.toUrl("./behavior.html"));
	}
});
