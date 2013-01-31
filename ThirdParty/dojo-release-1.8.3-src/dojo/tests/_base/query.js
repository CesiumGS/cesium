define(["doh/main", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests._base.query", require.toUrl("./query.html"), 60000);	// tests dojo.query() back-compat shim
		doh.register("tests._base.NodeList", require.toUrl("./NodeList.html"), 60000);
	}
});
