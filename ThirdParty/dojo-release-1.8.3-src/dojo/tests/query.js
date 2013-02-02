define(["doh/main", "dojo/sniff", "require"], function(doh, has, require){
	if(doh.isBrowser){
		// Test dojo/query with every query engine/CSS level setting, plus with nothing specified
		doh.register("tests.query-lite", require.toUrl("./query/query.html?selector=lite"), 30000);
		doh.register("tests.query-css2", require.toUrl("./query/query.html?selector=css2"), 30000);
		doh.register("tests.query-css2.1", require.toUrl("./query/query.html?selector=css2.1"), 30000);
		doh.register("tests.query-css3", require.toUrl("./query/query.html?selector=css3"), 30000);
		doh.register("tests.query-acme", require.toUrl("./query/query.html?selector=acme"), 30000);
		doh.register("tests.query-unspecified", require.toUrl("./query/query.html"), 30000);

		// Test quirks mode too, except on IE9+ because of the IE problem where the iframe gets confused about its
		// mode when the iframe is quirks but the parent is standards.
		if(!(has("ie") >= 9)){
			doh.register("tests.query-lite-quirks", require.toUrl("./query/queryQuirks.html?selector=lite"), 30000);
			doh.register("tests.query-css2-quirks", require.toUrl("./query/queryQuirks.html?selector=css2"), 30000);
			doh.register("tests.query-css2.1-quirks", require.toUrl("./query/queryQuirks.html?selector=css2.1"), 30000);
			doh.register("tests.query-css3-quirks", require.toUrl("./query/queryQuirks.html?selector=css3"), 30000);
			doh.register("tests.query-acme-quirks", require.toUrl("./query/queryQuirks.html?selector=acme"), 30000);
			doh.register("tests.query-unspecified-quirks", require.toUrl("./query/queryQuirks.html"), 30000);
		}

		// Test loading XHTML document.   Commented out on IE since it causes a warning dialog
		if(!has("ie")){
			doh.register("tests.query-xml", require.toUrl("./query/xml.xhtml"), 30000);
		}
	}
});
