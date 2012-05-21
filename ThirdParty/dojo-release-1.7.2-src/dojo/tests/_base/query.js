define(["doh", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests._base.query", require.toUrl("./query.html"), 60000);
		doh.register("tests._base.NodeList", require.toUrl("./NodeList.html"), 60000);
	}
});
