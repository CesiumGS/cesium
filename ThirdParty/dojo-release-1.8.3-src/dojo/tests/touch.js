define(["doh/main", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("tests.touch", require.toUrl("./test_touch.html"));
	}
});

