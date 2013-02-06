define(["doh/main", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests.NodeList-manipulate", require.toUrl("./NodeList-manipulate.html"), 30000);
	}
});
