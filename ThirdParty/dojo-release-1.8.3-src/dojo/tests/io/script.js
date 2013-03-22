define(["doh/main", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests.io.script", require.toUrl("./script.html"));
	}
});
