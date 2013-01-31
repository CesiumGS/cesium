define(["doh/main", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests.dom-style", require.toUrl("./dom-style.html"), 30000);
	}
});
