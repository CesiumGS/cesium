define(["doh", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests.NodeList-data", require.toUrl("./NodeList-data.html"), 30000);
	}
});
