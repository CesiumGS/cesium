define(["doh/main", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests.fx", require.toUrl("./fx.html"), 30000);
		doh.register("tests.NodeList-fx", require.toUrl("./NodeList-fx.html"), 30000);
	}
});

