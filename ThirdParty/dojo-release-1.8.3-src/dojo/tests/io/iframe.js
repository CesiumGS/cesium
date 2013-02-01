define(["doh/main", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests.io.iframe", require.toUrl("./iframe.html"));
	}
});
