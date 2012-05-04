define(["doh", "require"], function(doh, require){

	doh.register("tests.uacss.sniffQuirks", require.toUrl("./uacss/sniffQuirks.html"));
	doh.register("tests.uacss.sniffStandards", require.toUrl("./uacss/sniffStandards.html"));

});

