define(["doh/main", "require"], function(doh, require){
	if(doh.isBrowser){
		doh.register("parser", require.toUrl("./parser/parser.html"), 30000);
		doh.register("parseOnLoad-auto-require", require.toUrl("./parser/parseOnLoadAutoRequire.html"), 30000);
		doh.register("parseOnLoad-declarative-require", require.toUrl("./parser/parseOnLoadDeclarativeRequire.html"), 30000);
		doh.register("parser-args", require.toUrl("./parser/parser-args.html"), 30000);
	}
});
