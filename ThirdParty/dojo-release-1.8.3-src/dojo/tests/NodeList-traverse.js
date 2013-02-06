define(["doh/main", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests.NodeList-traverse", require.toUrl("./NodeList-traverse.html"), 30000);
	}
});
