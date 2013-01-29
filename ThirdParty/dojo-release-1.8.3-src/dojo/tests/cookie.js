define(["doh/main", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests.cookie", require.toUrl("./cookie.html"), 30000);
	}
});
