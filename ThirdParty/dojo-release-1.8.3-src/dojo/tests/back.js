define(["doh/main", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests.back", require.toUrl("./back.html"), 30000);
	}
});
